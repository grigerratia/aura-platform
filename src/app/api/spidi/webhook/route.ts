// src/app/api/spidi/webhook/route.ts
// Receptor oficial de Webhooks SPIDI con validación criptográfica HMAC-SHA256 e idempotencia.
// Cada evento se resuelve ÚNICAMENTE por session_id y afecta solo a la fase de esa sesión.

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySpidiWebhookSignature } from '@/lib/spidi';
import { failSession, isPaidStatus, settleSession, type SpidiTxRow } from '@/lib/spidiSettlement';

const TX_COLUMNS =
  'session_id, phase, reservation_pin, reservation_id, status, bank_reference_id, amount_usd';

export async function POST(req: NextRequest) {
  try {
    // 1. Cuerpo crudo exacto (la firma se calcula sobre timestamp + "." + rawBody)
    const rawBody = await req.text();

    const signature = req.headers.get('spidi-signature');
    const timestamp = req.headers.get('spidi-timestamp');
    const idempotencyKey = req.headers.get('idempotency-key');

    // 2. Regla de certificación SPIDI: firma inválida o cabeceras faltantes => 401
    if (!verifySpidiWebhookSignature(rawBody, timestamp, signature)) {
      console.warn('[SPIDI Webhook] Firma inválida o cabeceras faltantes.', {
        hasTimestamp: Boolean(timestamp),
        hasSignature: Boolean(signature),
      });
      return NextResponse.json({ error: 'Firma inválida o cabeceras incompletas.' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const event: string | undefined = payload?.event;
    const data = payload?.data || {};
    const sessionId: string | undefined = data?.session_id || data?.id;

    // 3. Deduplicación por idempotency-key
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from('spidi_transactions')
        .select('session_id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({
          success: true,
          message: 'Aviso deduplicado por idempotency-key.',
          deduplicated: true,
        });
      }
    }

    // 4. Resolver la transacción exacta de esta sesión (nunca por PIN)
    if (!sessionId) {
      return NextResponse.json({ success: true, event, received: true, ignored: 'sin session_id' });
    }

    const { data: txData } = await supabase
      .from('spidi_transactions')
      .select(TX_COLUMNS)
      .eq('session_id', sessionId)
      .maybeSingle();

    const tx = txData as SpidiTxRow | null;
    if (!tx || !tx.phase) {
      console.warn('[SPIDI Webhook] Sesión desconocida o sin fase, se ignora:', sessionId);
      return NextResponse.json({ success: true, event, received: true, ignored: 'sesion_desconocida' });
    }

    const bankRef: string | null =
      data?.session_payment?.bank_reference_id ||
      data?.bank_reference_id ||
      data?.session_payment?.payment_details?.bank_reference ||
      null;

    // 5. Manejo de eventos
    switch (event) {
      case 'payment_session.paid': {
        if (!isPaidStatus(tx.status)) {
          await settleSession(tx, 'paid', bankRef, idempotencyKey);
        }
        break;
      }

      case 'payment_session.accredited': {
        await settleSession(tx, 'accredited', bankRef || tx.bank_reference_id, idempotencyKey);
        break;
      }

      case 'payment_session.failed':
      case 'payment_session.expired': {
        await failSession(tx, event === 'payment_session.failed' ? 'failed' : 'expired');
        break;
      }

      default:
        // Evento informativo (ej. payment_session.created): responder 2xx
        break;
    }

    return NextResponse.json({ success: true, event, received: true });
  } catch (err: any) {
    console.error('[SPIDI Webhook Processing Error]', err);
    // Error interno no relacionado con firma: 500 para que SPIDI reintente
    return NextResponse.json(
      { error: err.message || 'Error interno al procesar webhook' },
      { status: 500 }
    );
  }
}
