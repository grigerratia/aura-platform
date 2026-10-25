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
    // REGLA ESTRICTA: Si se consultó por sessionId específico (ej. Paso 2 abono), NO usar el estado de Paso 1 (aura_fee_status)
    const isLocalPaid = sessionId
      ? (localTx?.status === 'paid' || localTx?.status === 'accredited')
      : (localTx?.status === 'paid' || localTx?.status === 'accredited' || localRes?.aura_fee_status === 'paid');

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
    // REGLA CIRUJANO: PROHIBIDO auto-confirmar por tiempo transcurrido (elapsedMs >= 3000 eliminado).
    // Solo se confirma si se solicitó explícitamente simulación o si la sesión ya fue marcada como pagada.
    if (activeSessionId && activeSessionId.startsWith('sim_')) {
      if (localTx?.status === 'paid' || localTx?.status === 'accredited') {
        const simRef = localTx?.bank_reference_id || `SIM-${activeSessionId.slice(-6).toUpperCase()}`;
        return NextResponse.json({
          isPaid: true,
          status: 'paid',
          bankReferenceId: simRef,
          amountUsd: localTx?.amount_usd || 0.5,
        });
      }

      if (isSimulateRequested) {
        const simRef = `SIM-${activeSessionId.slice(-6).toUpperCase()}`;
        try {
          await supabase
            .from('spidi_transactions')
            .update({
              status: 'paid',
              bank_reference_id: simRef,
              updated_at: new Date().toISOString(),
            })
            .eq('session_id', activeSessionId);
        } catch {}

        return NextResponse.json({
          isPaid: true,
          status: 'paid',
          bankReferenceId: simRef,
          amountUsd: localTx?.amount_usd || 0.5,
        });
      }

      return NextResponse.json({
        isPaid: false,
        status: localTx?.status || 'pending',
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

/**
 * Confirmación explícita de pago desde el simulador o callback de pasarela
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, pin, feeType, status = 'paid', bankReferenceId } = body;

    const ref = bankReferenceId || (sessionId ? `SPIDI-${sessionId.slice(-6).toUpperCase()}` : 'SPIDI-CONFIRMADO');
    const cleanPin = pin ? String(pin).trim() : '';
    const isStoreDeposit = feeType === 'store_deposit' || (sessionId && String(sessionId).includes('TIENDA'));

    // 1. Actualizar spidi_transactions
    if (sessionId) {
      try {
        await supabase
          .from('spidi_transactions')
          .update({
            status: 'paid',
            bank_reference_id: ref,
            updated_at: new Date().toISOString(),
          })
          .eq('session_id', sessionId);
      } catch (txErr) {
        console.warn('[SPIDI Status POST] Error actualizando spidi_transactions:', txErr);
      }
    }

    // 2. Actualizar reservations si tenemos pin o sessionId
    const resUpdate: Record<string, any> = isStoreDeposit
      ? {
          status: 'confirmed',
          payment_method: 'pago_movil',
          payment_reference: ref,
          spidi_status: 'paid',
          spidi_bank_reference: ref,
          updated_at: new Date().toISOString(),
        }
      : {
          aura_fee_status: 'paid',
          aura_fee_verified_at: new Date().toISOString(),
          aura_fee_reference: ref,
          spidi_status: 'paid',
          spidi_bank_reference: ref,
          updated_at: new Date().toISOString(),
        };

    if (sessionId) {
      try {
        await supabase.from('reservations').update(resUpdate).eq('spidi_session_id', sessionId);
      } catch {}
    }

    if (cleanPin) {
      try {
        await supabase.from('reservations').update(resUpdate).eq('pin_code', cleanPin);
      } catch {}
    }

    return NextResponse.json({
      success: true,
      isPaid: true,
      status: 'paid',
      bankReferenceId: ref,
      sessionId,
    });
  } catch (err: any) {
    console.error('[SPIDI Status POST Error]', err);
    return NextResponse.json(
      { error: err.message || 'Error al actualizar sesión de pago.' },
      { status: 500 }
    );
  }
}


