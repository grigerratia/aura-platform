-- ==============================================================================
-- AURA PLATFORM - EXTENSIÓN DE COLUMNAS DE RESERVAS (ESTADOS, MÉTODOS Y PASOS)
-- Añade soporte nativo en Supabase para trazabilidad de apartados, flujo de cliente,
-- referencias de pago y notas de auditoría.
-- ==============================================================================

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS payment_type TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS current_step TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS initial_deposit NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_reservations_payment_type ON public.reservations(payment_type);
CREATE INDEX IF NOT EXISTS idx_reservations_current_step ON public.reservations(current_step);

