// src/app/api/spidi/status/route.ts
// Consulta de estado de pago en tiempo real con fallback directo al API de SPIDI

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSpidiSessionStatus } from '@/lib/spidi';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId')?.trim();
    const pin = searchParams.get('pin')?.trim();

    if (!sessionId && !pin) {
      return NextResponse.json(
        { error: 'Se requiere sessionId o pin para consultar el estado.' },
        { status: 400 }
      );
    }

    // 1. Consultar estado en base de datos local
    let localTx: any = null;
    let localRes: any = null;

    if (sessionId) {
      const { data } = await supabase
        .from('spidi_transactions')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();
      localTx = data;
    }

    if (pin) {
      const { data } = await supabase
        .from('reservations')
        .select('*')
        .eq('pin_code', pin)
        .maybeSingle();
      localRes = data;

      if (!localTx && localRes?.spidi_session_id) {
        const { data: tx } = await supabase
          .from('spidi_transactions')
          .select('*')
          .eq('session_id', localRes.spidi_session_id)
          .maybeSingle();
        localTx = tx;
      }
    }

    // Si ya está confirmado como pagado en DB local
    const isLocalPaid =
      localTx?.status === 'paid' ||
      localTx?.status === 'accredited' ||
      localRes?.aura_fee_status === 'paid';

    if (isLocalPaid) {
      return NextResponse.json({
        isPaid: true,
        status: localTx?.status || 'paid',
        bankReferenceId: localTx?.bank_reference_id || localRes?.spidi_bank_reference || null,
        amountUsd: localTx?.amount_usd || localRes?.unlock_fee_usd,
      });
    }

    // 2. Si aún no está marcado como pagado localmente y tenemos sessionId,
    // consultar directamente al API de SPIDI (comprobación activa del servidor)
    const activeSessionId = sessionId || localTx?.session_id || localRes?.spidi_session_id;

    if (activeSessionId && !activeSessionId.startsWith('sim_')) {
      try {
        const remoteStatus = await getSpidiSessionStatus(activeSessionId);
        const remoteState = remoteStatus?.status;

        if (remoteState === 'paid' || remoteState === 'accredited') {
          const bankRef =
            remoteStatus?.session_payment?.bank_reference_id ||
            remoteStatus?.session_payment?.payment_details?.bank_reference ||
            '';

          // Actualizar transacción en DB
          await supabase
            .from('spidi_transactions')
            .update({
              status: remoteState,
              bank_reference_id: bankRef || undefined,
              updated_at: new Date().toISOString(),
            })
            .eq('session_id', activeSessionId);

          // Actualizar reserva
          const updateRes: Record<string, any> = {
            aura_fee_status: 'paid',
            aura_fee_verified_at: new Date().toISOString(),
            aura_fee_reference: bankRef ? `SPIDI-${bankRef}` : `SPIDI-${activeSessionId}`,
            spidi_status: remoteState,
          };
          if (bankRef) updateRes.spidi_bank_reference = bankRef;

          await supabase
            .from('reservations')
            .update(updateRes)
            .eq('spidi_session_id', activeSessionId);

          return NextResponse.json({
            isPaid: true,
            status: remoteState,
            bankReferenceId: bankRef || null,
            amountUsd: remoteStatus?.amount_reference,
          });
        }

        return NextResponse.json({
          isPaid: false,
          status: remoteState || 'pending',
          bankReferenceId: null,
        });
      } catch (remoteErr) {
        console.warn('[SPIDI Status] Error al consultar API de SPIDI:', remoteErr);
      }
    }

    return NextResponse.json({
      isPaid: false,
      status: localTx?.status || 'pending',
      bankReferenceId: null,
    });
  } catch (err: any) {
    console.error('[SPIDI Status Error]', err);
    return NextResponse.json(
      { error: err.message || 'Error al verificar estado de pago.' },
      { status: 500 }
    );
  }
}

