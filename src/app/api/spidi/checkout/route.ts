// src/app/api/spidi/checkout/route.ts
// Genera una sesión de pago segura SPIDI para el Desbloqueo y Custodia de Aura (5%)

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createSpidiButtonSession, getSpidiConfig } from '@/lib/spidi';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reservationId, pin, amountUsd, productName } = body;

    if (!amountUsd || isNaN(Number(amountUsd)) || Number(amountUsd) <= 0) {
      return NextResponse.json(
        { error: 'El monto en USD es inválido o menor a cero.' },
        { status: 400 }
      );
    }

    const cleanPin = pin ? String(pin).trim() : '';
    const identifier = cleanPin ? `PIN-${cleanPin}` : `RES-${String(reservationId || Date.now()).slice(0, 12)}`;
    const description = `Desbloqueo Aura (5%): ${productName || 'Reserva de producto'}`.slice(0, 100);

    const config = getSpidiConfig();

    // Crear sesión oficial en SPIDI
    const spidiRes = await createSpidiButtonSession({
      amountUsd: Number(amountUsd),
      identifier,
      description,
      durationMinutes: 20, // 20 minutos máximo de sesión botón
    });

    const sessionData = spidiRes.data;

    // Registrar en tabla spidi_transactions para auditoría y verificación cruzada
    const isValidUUID = Boolean(reservationId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reservationId));

    try {
      await supabase.from('spidi_transactions').insert({
        session_id: sessionData.session_id,
        reservation_id: isValidUUID ? reservationId : null,
        account_id: config.accountId,
        agreement_id: sessionData.agreement_id || config.agreementId,
        amount_usd: sessionData.amount_reference,
        status: 'created',
        identifier: sessionData.identifier,
        description: sessionData.description,
        payment_url: sessionData.payment_url,
        payment_qr: sessionData.payment_qr,
        metadata: {
          reservationId,
          pin: cleanPin,
          productName,
        },
      });

      // Actualizar reserva en Supabase si existe
      if (isValidUUID) {
        await supabase
          .from('reservations')
          .update({
            spidi_session_id: sessionData.session_id,
            spidi_status: 'created',
          })
          .eq('id', reservationId);
      } else if (cleanPin) {
        await supabase
          .from('reservations')
          .update({
            spidi_session_id: sessionData.session_id,
            spidi_status: 'created',
          })
          .eq('pin_code', cleanPin);
      }
    } catch (dbErr) {
      console.warn('[SPIDI Checkout] Advertencia al persistir en base de datos:', dbErr);
    }

    return NextResponse.json({
      success: true,
      sessionId: sessionData.session_id,
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
