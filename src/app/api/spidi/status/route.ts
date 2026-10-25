// src/app/api/spidi/status/route.ts
// Consulta de estado por sesión/fase. Solo lectura: un pago se da por confirmado únicamente
// si el webhook firmado o el API oficial de SPIDI lo confirman para ESA sesión.
//
//  GET ?sessionId=...          -> estado de una sesión concreta
//  GET ?pin=...&phase=...      -> sesión más reciente de esa fase para el PIN
//  GET ?pin=...                -> estado de ambas fases (restauración de la UI)

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSpidiSessionStatus, isSpidiPhase, type SpidiPhase } from '@/lib/spidi';
import { isPaidStatus, settleSession, type SpidiTxRow } from '@/lib/spidiSettlement';

const TX_COLUMNS =
  'session_id, phase, reservation_pin, reservation_id, status, bank_reference_id, amount_usd, payment_url, payment_qr, created_at';

interface PhaseState {
  sessionId: string | null;
  isPaid: boolean;
  status: string;
  bankReferenceId: string | null;
  amountUsd: number | null;
}

const EMPTY_STATE: PhaseState = {
  sessionId: null,
  isPaid: false,
  status: 'none',
  bankReferenceId: null,
  amountUsd: null,
};

/** Confirma contra SPIDI si la sesión aún figura pendiente localmente. */
async function refreshFromSpidi(tx: SpidiTxRow): Promise<SpidiTxRow> {
  if (isPaidStatus(tx.status) || tx.status === 'failed' || tx.status === 'expired' || tx.status === 'superseded') {
    return tx;
  }
  try {
    const remote = await getSpidiSessionStatus(tx.session_id);
    const remoteState: string | undefined = remote?.status;
    if (remoteState === 'paid' || remoteState === 'accredited') {
      const bankRef =
        remote?.session_payment?.bank_reference_id ||
        remote?.session_payment?.receiver_credits?.owner?.bank_reference_id ||
        remote?.session_payment?.payment_details?.bank_reference ||
        null;
      return await settleSession(tx, remoteState, bankRef);
    }
  } catch (err: any) {
    console.warn('[SPIDI Status] Error al consultar API de SPIDI:', err?.message || err);
  }
  return tx;
}

function toPhaseState(tx: SpidiTxRow | null): PhaseState {
  if (!tx) return EMPTY_STATE;
  return {
    sessionId: tx.session_id,
    isPaid: isPaidStatus(tx.status),
    status: tx.status,
    bankReferenceId: tx.bank_reference_id || null,
    amountUsd: tx.amount_usd !== null && tx.amount_usd !== undefined ? Number(tx.amount_usd) : null,
  };
}

/** Sesión vigente de una fase: la pagada si existe; si no, la más reciente no reemplazada. */
async function latestTxForPhase(pin: string, phase: SpidiPhase): Promise<SpidiTxRow | null> {
  const { data } = await supabase
    .from('spidi_transactions')
    .select(TX_COLUMNS)
    .eq('reservation_pin', pin)
    .eq('phase', phase)
    .neq('status', 'superseded')
    .order('created_at', { ascending: false });

  const rows = (data || []) as SpidiTxRow[];
  return rows.find((r) => isPaidStatus(r.status)) || rows[0] || null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId')?.trim();
    const pin = searchParams.get('pin')?.trim();
    const phaseParam = searchParams.get('phase');

    if (!sessionId && !pin) {
      return NextResponse.json(
        { error: 'Se requiere sessionId o pin para consultar el estado.' },
        { status: 400 }
      );
    }

    // A. Sesión concreta: el resultado depende SOLO de esa sesión
    if (sessionId) {
      const { data } = await supabase
        .from('spidi_transactions')
        .select(TX_COLUMNS)
        .eq('session_id', sessionId)
        .maybeSingle();

      if (!data) {
        return NextResponse.json({ ...EMPTY_STATE, sessionId, status: 'unknown' }, { status: 404 });
      }

      const tx = await refreshFromSpidi(data as SpidiTxRow);
      return NextResponse.json({ ...toPhaseState(tx), phase: tx.phase });
    }

    // B. PIN + fase específica
    if (pin && isSpidiPhase(phaseParam)) {
      const latest = await latestTxForPhase(pin, phaseParam);
      const tx = latest ? await refreshFromSpidi(latest) : null;
      return NextResponse.json({ ...toPhaseState(tx), phase: phaseParam });
    }

    // C. PIN sin fase: ambas fases por separado
    const [auraLatest, storeLatest] = await Promise.all([
      latestTxForPhase(pin!, 'aura_fee'),
      latestTxForPhase(pin!, 'store_payment'),
    ]);
    const [auraTx, storeTx] = await Promise.all([
      auraLatest ? refreshFromSpidi(auraLatest) : Promise.resolve(null),
      storeLatest ? refreshFromSpidi(storeLatest) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      aura: toPhaseState(auraTx),
      store: toPhaseState(storeTx),
    });
  } catch (err: any) {
    console.error('[SPIDI Status Error]', err);
    return NextResponse.json(
      { error: err.message || 'Error al verificar estado de pago.' },
      { status: 500 }
    );
  }
}
