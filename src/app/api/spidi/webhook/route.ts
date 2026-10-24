// src/app/api/spidi/webhook/route.ts
// Receptor oficial de Webhooks SPIDI con validación criptográfica HMAC-SHA256 e idempotencia

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySpidiWebhookSignature } from '@/lib/spidi';

export async function POST(req: NextRequest) {
  try {
    // 1. Obtener cuerpo crudo en texto exacto para no alterar espacios ni orden de campos
    const rawBody = await req.text();

    // 2. Extraer cabeceras oficiales SPIDI
    const signature = req.headers.get('spidi-signature');
    const timestamp = req.headers.get('spidi-timestamp');
    const idempotencyKey = req.headers.get('idempotency-key');

    // 3. REGLA ESTRICTA DE PRECERTIFICACIÓN SPIDI:
    // Si falta timestamp o firma, o la firma no cuadra con HMAC-SHA256(secreto, timestamp + "." + rawBody),
    // DEBE responder 401 Unauthorized inmediatamente.
    const isValid = verifySpidiWebhookSignature(rawBody, timestamp, signature);

    if (!isValid) {
      console.warn('[SPIDI Webhook] Intento de acceso con firma inválida o cabeceras faltantes.', {
        hasTimestamp: Boolean(timestamp),
        hasSignature: Boolean(signature),
      });
      return NextResponse.json(
        { error: 'Firma inválida o cabeceras incompletas.' },
        { status: 401 }
      );
    }

    // 4. Parsear el cuerpo JSON verificado
    const payload = JSON.parse(rawBody);
    const event = payload?.event;
    const data = payload?.data || {};
    const sessionId = data?.session_id || data?.id;
    const identifier = data?.identifier;

    // 5. DEDUPLICACIÓN POR IDEMPOTENCIA
    // Si ya procesamos exactamente este idempotencyKey, respondemos 200 sin repetir efectos
    if (idempotencyKey) {
      const { data: existingTx } = await supabase
        .from('spidi_transactions')
        .select('session_id, idempotency_key, status')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existingTx) {
        return NextResponse.json({
          success: true,
          message: 'Aviso deduplicado por idempotency-key.',
          deduplicated: true,
        });
      }
    }

    // 6. MANEJO DE EVENTOS
    switch (event) {
      case 'payment_session.paid': {
        // Fase 1: El pagador realizó el débito exitoso en su banco
        const bankRef =
          data?.session_payment?.bank_reference_id ||
          data?.bank_reference_id ||
          data?.session_payment?.payment_details?.bank_reference ||
          '';

        // Actualizar transacción SPIDI
        if (sessionId) {
          await supabase
            .from('spidi_transactions')
            .update({
              status: 'paid',
              idempotency_key: idempotencyKey || null,
              bank_reference_id: bankRef || null,
              updated_at: new Date().toISOString(),
            })
            .eq('session_id', sessionId);
        }

        // Localizar y actualizar la reserva asociada
        // Identificador suele ser "PIN-8091" o "PIN-8091-TIENDA" o UUID
        const isStoreDeposit = Boolean(identifier && identifier.includes('-TIENDA'));
        let pinCode = '';
        if (identifier && identifier.startsWith('PIN-')) {
          pinCode = identifier.replace('PIN-', '').replace('-TIENDA', '').trim();
        }

        const updateData: Record<string, any> = isStoreDeposit
          ? {
              payment_method: 'pago_movil',
              payment_reference: bankRef ? `SPIDI-${bankRef}` : `SPIDI-${sessionId}`,
              status: 'confirmed',
              current_step: 'OPTION_B_CONFIRMED',
            }
          : {
              aura_fee_status: 'paid',
              aura_fee_verified_at: new Date().toISOString(),
              aura_fee_reference: bankRef ? `SPIDI-${bankRef}` : `SPIDI-${sessionId}`,
              spidi_status: 'paid',
            };

        if (bankRef) {
          updateData.spidi_bank_reference = bankRef;
        }

        if (sessionId) {
          await supabase
            .from('reservations')
            .update(updateData)
            .eq('spidi_session_id', sessionId);
        }

        if (pinCode) {
          await supabase
            .from('reservations')
            .update(updateData)
            .eq('pin_code', pinCode);
        }

        break;
      }

      case 'payment_session.accredited': {
        // Fase 2: Fondos acreditados en cuenta bancaria receptora
        const bankRef =
          data?.session_payment?.bank_reference_id ||
          data?.bank_reference_id ||
          '';

        if (sessionId) {
          await supabase
            .from('spidi_transactions')
            .update({
              status: 'accredited',
              bank_reference_id: bankRef || null,
              updated_at: new Date().toISOString(),
            })
            .eq('session_id', sessionId);

          await supabase
            .from('reservations')
            .update({
              spidi_status: 'accredited',
              spidi_bank_reference: bankRef || undefined,
            })
            .eq('spidi_session_id', sessionId);
        }
        break;
      }

      case 'payment_session.failed':
      case 'payment_session.expired': {
        const failureStatus = event === 'payment_session.failed' ? 'failed' : 'expired';
        if (sessionId) {
          await supabase
            .from('spidi_transactions')
            .update({
              status: failureStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('session_id', sessionId);

          await supabase
            .from('reservations')
            .update({
              spidi_status: failureStatus,
            })
            .eq('spidi_session_id', sessionId);
        }
        break;
      }

      default:
        // Evento informativo (ej. payment_session.created) o futuro: responder 2xx sin fallar
        break;
    }

    return NextResponse.json({
      success: true,
      event,
      received: true,
    });
  } catch (err: any) {
    console.error('[SPIDI Webhook Processing Error]', err);
    // Para errores internos no relacionados con firma, devolver 500 para permitir reintento de SPIDI
    return NextResponse.json(
      { error: err.message || 'Error interno al procesar webhook' },
      { status: 500 }
    );
  }
}

