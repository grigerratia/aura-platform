-- ==============================================================================
-- AURA PLATFORM - SPIDI: PAGOS INDEPENDIENTES POR FASE
-- Pago 1 (aura_fee: comisión Aura) y Pago 2 (store_payment: saldo/inicial tienda)
-- tienen sesiones propias, nunca comparten columna de sesión ni estado.
-- ==============================================================================

ALTER TABLE public.spidi_transactions
  ADD COLUMN IF NOT EXISTS phase TEXT,
  ADD COLUMN IF NOT EXISTS reservation_pin TEXT,
  ADD COLUMN IF NOT EXISTS expected_amount_usd NUMERIC(12,2);

ALTER TABLE public.spidi_transactions
  DROP CONSTRAINT IF EXISTS spidi_transactions_phase_check;
ALTER TABLE public.spidi_transactions
  ADD CONSTRAINT spidi_transactions_phase_check
  CHECK (phase IS NULL OR phase IN ('aura_fee', 'store_payment'));

CREATE INDEX IF NOT EXISTS idx_spidi_transactions_pin_phase
  ON public.spidi_transactions(reservation_pin, phase);

-- Solo una sesión activa ("created") por PIN y fase. Las anteriores se marcan "superseded".
CREATE UNIQUE INDEX IF NOT EXISTS uq_spidi_transactions_active_pin_phase
  ON public.spidi_transactions(reservation_pin, phase)
  WHERE status = 'created' AND reservation_pin IS NOT NULL AND phase IS NOT NULL;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS spidi_aura_session_id TEXT,
  ADD COLUMN IF NOT EXISTS spidi_store_session_id TEXT,
  ADD COLUMN IF NOT EXISTS spidi_store_status TEXT,
  ADD COLUMN IF NOT EXISTS spidi_store_bank_reference TEXT,
  ADD COLUMN IF NOT EXISTS store_payment_mode TEXT;

CREATE INDEX IF NOT EXISTS idx_reservations_spidi_aura_session_id ON public.reservations(spidi_aura_session_id);
CREATE INDEX IF NOT EXISTS idx_reservations_spidi_store_session_id ON public.reservations(spidi_store_session_id);

-- Backfill: sesiones antiguas pertenecen a la fase de comisión Aura (comportamiento previo)
UPDATE public.spidi_transactions
  SET phase = CASE WHEN identifier ILIKE '%-TIENDA%' THEN 'store_payment' ELSE 'aura_fee' END
  WHERE phase IS NULL;
