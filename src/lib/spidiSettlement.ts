// src/lib/spidiSettlement.ts
// Liquidación por fase: cada sesión SPIDI solo afecta a SU fase (aura_fee o store_payment).
// Nunca se lee ni se escribe el estado de la otra fase.

import { supabase } from '@/lib/supabase';
import type { SpidiPhase } from '@/lib/spidi';

export type SpidiTxStatus = 'created' | 'paid' | 'accredited' | 'failed' | 'expired' | 'superseded';

export interface SpidiTxRow {
  session_id: string;
  phase: SpidiPhase | null;
  reservation_pin: string | null;
  reservation_id: string | null;
  status: SpidiTxStatus;
  bank_reference_id: string | null;
  amount_usd: number | null;
  payment_url?: string | null;
  payment_qr?: string | null;
}

export const isPaidStatus = (status?: string | null) => status === 'paid' || status === 'accredited';

/**
 * Marca una sesión como pagada/acreditada y refleja el resultado únicamente en
 * las columnas de la fase a la que pertenece.
 */
export async function settleSession(
  tx: SpidiTxRow,
  status: 'paid' | 'accredited',
  bankRef: string | null,
  idempotencyKey?: string | null
): Promise<SpidiTxRow> {
  const now = new Date().toISOString();
  const ref = bankRef || `SPIDI-${tx.session_id.slice(-6).toUpperCase()}`;

  const txUpdate: Record<string, any> = {
    status,
    bank_reference_id: ref,
    updated_at: now,
  };
  if (idempotencyKey) txUpdate.idempotency_key = idempotencyKey;

  const { error: txErr } = await supabase
    .from('spidi_transactions')
    .update(txUpdate)
    .eq('session_id', tx.session_id);
  if (txErr) throw new Error(`No se pudo actualizar spidi_transactions: ${txErr.message}`);

 if (tx.phase === 'aura_fee' && tx.reservation_pin) {
    const { error } = await supabase
      .from('reservations')
      .update({
        spidi_aura_session_id: tx.session_id,
        aura_fee_status: 'paid',
        aura_fee_verified_at: now,
        aura_fee_reference: ref,
        spidi_status: status,
        spidi_bank_reference: ref,
        updated_at: now,
      })
      .eq('pin_code', tx.reservation_pin);
    if (error) console.warn('[SPIDI Settlement] reservations (aura_fee):', error.message);
  } else if (tx.phase === 'store_payment' && tx.reservation_pin) {
    const { error } = await supabase
      .from('reservations')
      .update({
        spidi_store_session_id: tx.session_id,
        status: 'confirmed',
        payment_method: 'pago_movil',
        payment_reference: ref,
        spidi_store_status: status,
        spidi_store_bank_reference: ref,
        updated_at: now,
      })
      .eq('pin_code', tx.reservation_pin);
    if (error) console.warn('[SPIDI Settlement] reservations (store_payment):', error.message);
  }

  return { ...tx, status, bank_reference_id: ref };
}

/** Marca una sesión como fallida/expirada sin degradar una sesión ya pagada. */
export async function failSession(tx: SpidiTxRow, status: 'failed' | 'expired'): Promise<SpidiTxRow> {
  if (isPaidStatus(tx.status)) return tx;
  const now = new Date().toISOString();

  await supabase
    .from('spidi_transactions')
    .update({ status, updated_at: now })
    .eq('session_id', tx.session_id);

  if (tx.phase === 'aura_fee') {
    await supabase
      .from('reservations')
      .update({ spidi_status: status })
      .eq('spidi_aura_session_id', tx.session_id);
  } else if (tx.phase === 'store_payment') {
    await supabase
      .from('reservations')
      .update({ spidi_store_status: status })
      .eq('spidi_store_session_id', tx.session_id);
  }

  return { ...tx, status };
}
