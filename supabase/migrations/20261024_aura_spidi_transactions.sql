-- ==============================================================================
-- AURA PLATFORM - INTEGRACIÓN SPIDI PAGOS (DESBLOQUEO Y CUSTODIA AUTOMÁTICA)
-- 1. Tabla spidi_transactions para auditoría, idempotencia y doble fase bancaria
-- 2. Trazabilidad en reservations (spidi_session_id, spidi_status, spidi_bank_reference)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.spidi_transactions (
  session_id TEXT PRIMARY KEY,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  account_id TEXT NOT NULL,
  agreement_id TEXT,
  amount_usd NUMERIC(12,2) NOT NULL,
  amount_ves NUMERIC(14,2),
  status TEXT NOT NULL DEFAULT 'created', -- 'created', 'paid', 'accredited', 'failed', 'expired'
  identifier TEXT,
  description TEXT,
  payment_url TEXT,
  payment_qr TEXT,
  bank_reference_id TEXT,
  idempotency_key TEXT UNIQUE,
  webhook_events JSONB[] DEFAULT '{}'::jsonb[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_spidi_transactions_reservation_id ON public.spidi_transactions(reservation_id);
CREATE INDEX IF NOT EXISTS idx_spidi_transactions_status ON public.spidi_transactions(status);
CREATE INDEX IF NOT EXISTS idx_spidi_transactions_identifier ON public.spidi_transactions(identifier);

-- Habilitar RLS
ALTER TABLE public.spidi_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para cliente Aura y Webhooks
DROP POLICY IF EXISTS "Permitir lectura publica de spidi_transactions" ON public.spidi_transactions;
CREATE POLICY "Permitir lectura publica de spidi_transactions" 
  ON public.spidi_transactions FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Permitir insercion de spidi_transactions" ON public.spidi_transactions;
CREATE POLICY "Permitir insercion de spidi_transactions" 
  ON public.spidi_transactions FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion de spidi_transactions" ON public.spidi_transactions;
CREATE POLICY "Permitir actualizacion de spidi_transactions" 
  ON public.spidi_transactions FOR UPDATE TO public USING (true);

-- Columnas de enlace en reservations
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS spidi_session_id TEXT,
  ADD COLUMN IF NOT EXISTS spidi_status TEXT,
  ADD COLUMN IF NOT EXISTS spidi_bank_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_reservations_spidi_session_id ON public.reservations(spidi_session_id);

