// src/app/api/spidi/checkout/route.ts
// Crea una sesión SPIDI INDEPENDIENTE por fase de pago:
//  - aura_fee:      Pago 1, comisión Aura (5%)
//  - store_payment: Pago 2, inicial de tienda (30%) o saldo total restante (precio - comisión Aura)
// Los montos se calculan siempre en servidor a partir del precio de la reserva.

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  buildSpidiIdentifier,
  computePhaseAmountUsd,
  createSpidiButtonSession,
  getSpidiConfig,
  isSpidiPhase,
  type SpidiPhase,
  type StorePaymentMode,
} from '@/lib/spidi';
import { isPaidStatus } from '@/lib/spidiSettlement';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reservationId, productName } = body;
    const phase: SpidiPhase | undefined = isSpidiPhase(body.phase) ? body.phase : undefined;
    const storeMode: StorePaymentMode = body.storeMode === 'full_95' ? 'full_95' : 'deposit_30';
    const cleanPin = body.pin ? String(body.pin).trim() : '';

    if (!phase) {
      return NextResponse.json({ error: 'Fase de pago inválida.' }, { status: 400 });
    }
    if (!cleanPin) {
      return NextResponse.json({ error: 'Se requiere el PIN de la reserva.' }, { status: 400 });
    }

    // 1. Reserva real: fuente de verdad del precio
    const reservationQuery = supabase.from('reservations').select('*');
    const { data: reservation } =
      reservationId && UUID_RE.test(String(reservationId))
        ? await reservationQuery.eq('id', reservationId).maybeSingle()
        : await reservationQuery.eq('pin_code', cleanPin).maybeSingle();

    if (!reservation) {
      return NextResponse.json({ error: 'No se encontró la reserva asociada al pago.' }, { status: 404 });
    }

    const priceUsd = Number(reservation.total_price || reservation.price_usd);
    if (!priceUsd || isNaN(priceUsd) || priceUsd <= 0) {
      return NextResponse.json({ error: 'La reserva no tiene un precio válido.' }, { status: 400 });
    }

    // El apartado de dos pagos aplica únicamente al módulo Radar
    if (reservation.aura_fee_mode && reservation.aura_fee_mode !== 'radar') {
      return NextResponse.json(
        { error: 'El pago en dos fases solo aplica para reservas del Radar.' },
        { status: 400 }
      );
    }

    // 2. Pago 2 solo si el Pago 1 está verificado para ESTA reserva
    if (phase === 'store_payment') {
      const auraSessionId = reservation.spidi_aura_session_id;
      let auraPaid = false;
      if (auraSessionId) {
        const { data: auraTx } = await supabase
          .from('spidi_transactions')
          .select('status')
          .eq('session_id', auraSessionId)
          .maybeSingle();
        auraPaid = isPaidStatus(auraTx?.status);
      }
      if (!auraPaid) {
        const { data: auraByPin } = await supabase
          .from('spidi_transactions')
          .select('status')
          .eq('reservation_pin', cleanPin)
          .eq('phase', 'aura_fee')
          .in('status', ['paid', 'accredited'])
          .limit(1)
          .maybeSingle();
        auraPaid = Boolean(auraByPin);
      }
      if (!auraPaid && reservation.aura_fee_status !== 'paid') {
        return NextResponse.json(
          { error: 'Primero debes completar el desbloqueo de Aura (Pago 1).' },
          { status: 409 }
        );
      }

      const alreadyPaidStoreId = reservation.spidi_store_session_id;
      if (alreadyPaidStoreId) {
        const { data: storeTx } = await supabase
          .from('spidi_transactions')
          .select('status')
          .eq('session_id', alreadyPaidStoreId)
          .maybeSingle();
        if (isPaidStatus(storeTx?.status)) {
          return NextResponse.json({ error: 'El pago a la tienda ya fue confirmado.' }, { status: 409 });
        }
      }
    } else if (reservation.aura_fee_status === 'paid') {
      return NextResponse.json({ error: 'El desbloqueo de Aura ya fue pagado.' }, { status: 409 });
    }

    const amountUsd = computePhaseAmountUsd(priceUsd, phase, storeMode);
    const identifier = buildSpidiIdentifier(cleanPin, phase);
    const description =
      phase === 'aura_fee'
        ? `Desbloqueo Aura: ${productName || reservation.product_name || 'Reserva'}`.slice(0, 100)
        : `Apartado en tienda: ${productName || reservation.product_name || 'Producto'}`.slice(0, 100);

    const config = getSpidiConfig();
    // const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://aura-platform.vercel.app').replace(/\/+$/, '');
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/+$/, '');

    // 3. Marcar como reemplazadas las sesiones activas previas de ESTA fase (índice único parcial)
    await supabase
      .from('spidi_transactions')
      .update({ status: 'superseded', updated_at: new Date().toISOString() })
      .eq('reservation_pin', cleanPin)
      .eq('phase', phase)
      .eq('status', 'created');

    // 4. Crear sesión oficial en SPIDI (sin simulación: si falla, se informa el error)
    let sessionData;
    try {
      const spidiRes = await createSpidiButtonSession({
        amountUsd,
        identifier,
        description,
        phase,
        durationMinutes: 20,
        successUrl: `${baseUrl}/pago-exitoso?phase=${phase}&pin=${encodeURIComponent(cleanPin)}`,
        failureUrl: `${baseUrl}/pago-fallido?phase=${phase}&pin=${encodeURIComponent(cleanPin)}`,
      });
      sessionData = spidiRes.data;
    } catch (spidiErr: any) {
      console.error('[SPIDI Checkout] Error al crear sesión SPIDI:', spidiErr?.message || spidiErr);
      return NextResponse.json(
        { error: 'La pasarela de pagos no está disponible en este momento. Intenta de nuevo.' },
        { status: 502 }
      );
    }

    // Las URLs de retorno llevan phase+pin; la sesión activa se resuelve en /api/spidi/status
    const sessionId = sessionData.session_id;

    // 5. Registrar la sesión de ESTA fase
    const { error: insertErr } = await supabase.from('spidi_transactions').insert({
      session_id: sessionId,
      reservation_id: UUID_RE.test(String(reservation.id)) ? reservation.id : null,
      reservation_pin: cleanPin,
      phase,
      account_id: config.accountId,
      agreement_id: sessionData.agreement_id || config.agreementId,
      amount_usd: sessionData.amount_reference,
      expected_amount_usd: amountUsd,
      status: 'created',
      identifier: sessionData.identifier,
      description: sessionData.description,
      payment_url: sessionData.payment_url,
      payment_qr: sessionData.payment_qr,
      metadata: { phase, storeMode: phase === 'store_payment' ? storeMode : null, productName },
    });
    if (insertErr) {
      console.error('[SPIDI Checkout] No se pudo registrar la sesión:', insertErr.message);
      return NextResponse.json(
        { error: 'No se pudo registrar el pago. Intenta de nuevo.' },
        { status: 500 }
      );
    }

    // 6. Enlazar la sesión únicamente a las columnas de su fase
    const reservationUpdate: Record<string, any> =
      phase === 'aura_fee'
        ? { spidi_aura_session_id: sessionId, spidi_status: 'created' }
        : {
            spidi_store_session_id: sessionId,
            spidi_store_status: 'created',
            store_payment_mode: storeMode,
          };
    await supabase.from('reservations').update(reservationUpdate).eq('id', reservation.id);

    return NextResponse.json({
      success: true,
      phase,
      sessionId,
      paymentUrl: sessionData.payment_url,
      paymentQr: sessionData.payment_qr,
      amountUsd: sessionData.amount_reference,
      identifier: sessionData.identifier,
    });
  } catch (err: any) {
    console.error('[SPIDI Checkout Error]', err);
    return NextResponse.json(
      { error: err.message || 'Error interno al generar sesión de pago SPIDI.' },
      { status: 500 }
    );
  }
}
