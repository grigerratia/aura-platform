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
    const isSimulateRequested = searchParams.get('simulate') === 'true';

    // 2. Soporte nativo para modo simulado o test de pasarela
    if (activeSessionId && activeSessionId.startsWith('sim_')) {
      const parts = activeSessionId.split('_');
      const createdAtMs = Number(parts[1]) || Date.now();
      const elapsedMs = Date.now() - createdAtMs;

      // Auto-confirmar en simulación si pasaron más de 3 segundos o se solicitó simulación
      if (isSimulateRequested || elapsedMs >= 3000) {
        const simRef = `SIM-${activeSessionId.slice(-6).toUpperCase()}`;
        return NextResponse.json({
          isPaid: true,
          status: 'paid',
          bankReferenceId: simRef,
          amountUsd: localTx?.amount_usd || 0.5,
        });
      }

      return NextResponse.json({
        isPaid: false,
        status: 'pending',
        bankReferenceId: null,
      });
    }

    if (isSimulateRequested) {
      const simRef = `SIM-${Math.floor(100000 + Math.random() * 900000)}`;
      return NextResponse.json({
        isPaid: true,
        status: 'paid',
        bankReferenceId: simRef,
        amountUsd: localTx?.amount_usd || 0.5,
      });
    }

    // 3. Si tenemos sessionId real (ses_...), consultar directamente al API oficial de SPIDI
    if (activeSessionId) {
      try {
        const remoteStatus = await getSpidiSessionStatus(activeSessionId);
        const remoteState = remoteStatus?.status;

        if (remoteState === 'paid' || remoteState === 'accredited') {
          const bankRef =
            remoteStatus?.session_payment?.bank_reference_id ||
            remoteStatus?.session_payment?.receiver_credits?.owner?.bank_reference_id ||
            remoteStatus?.session_payment?.receiver_credits?.owner?.spidi_credit_id ||
            remoteStatus?.session_payment?.payment_details?.bank_reference ||
            remoteStatus?.session_payment?.receiver_credits?.owner?.account_holder?.document_number ||
            `SPIDI-${activeSessionId.slice(-6).toUpperCase()}`;

          // Actualizar transacción en DB de forma segura (sin bloquear en caso de tablas no migradas)
          try {
            await supabase
              .from('spidi_transactions')
              .update({
                status: remoteState,
                bank_reference_id: bankRef || undefined,
                updated_at: new Date().toISOString(),
              })
              .eq('session_id', activeSessionId);
          } catch {}

          // Retornar éxito inmediatamente
          return NextResponse.json({
            isPaid: true,
            status: remoteState,
            bankReferenceId: bankRef,
            amountUsd: remoteStatus?.amount_reference,
          });
        }

        return NextResponse.json({
          isPaid: false,
          status: remoteState || 'pending',
          bankReferenceId: null,
        });
      } catch (remoteErr: any) {
        console.warn('[SPIDI Status] Error al consultar API de SPIDI:', remoteErr?.message || remoteErr);
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

