-- ==============================================================================
-- AURA PLATFORM - MASTER HQ: CONTROL DE USUARIOS, BLOQUEOS Y BÓVEDA DE PAGOS AURA
-- 1. Control de bloqueo por impago en perfiles de compradores (profiles)
-- 2. Trazabilidad de pagos directos a Aura (5% Radar, Relámpago y Manadas)
-- ==============================================================================

-- 1. CONTROL DE BLOQUEO POR IMPAGO EN PROFILES
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS block_reason TEXT,
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;

-- 2. TRAZABILIDAD DE PAGOS A AURA EN RESERVATIONS
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS aura_fee_reference TEXT,
  ADD COLUMN IF NOT EXISTS aura_fee_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS aura_fee_mode TEXT DEFAULT 'radar',
  ADD COLUMN IF NOT EXISTS aura_fee_verified_at TIMESTAMPTZ;

-- Índices de aceleración para consultas ejecutivas del Master Dashboard
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON public.profiles(is_blocked);
CREATE INDEX IF NOT EXISTS idx_reservations_aura_fee_status ON public.reservations(aura_fee_status);
CREATE INDEX IF NOT EXISTS idx_reservations_aura_fee_mode ON public.reservations(aura_fee_mode);

