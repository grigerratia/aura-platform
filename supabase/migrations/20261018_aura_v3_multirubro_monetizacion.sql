-- ==============================================================================
-- AURA PLATFORM - MIGRACIÓN ESTRUCTURAL V3.0
-- 1. Soporte Multi-Rubro Universal (Polimorfismo con JSONB)
-- 2. Sistema de Monetización Híbrido de 4 Motores (Split-Payment 10%-90%)
-- 3. Billetera de Saldo a Favor y Candado de Confianza
-- 4. Aura VIP y Aura Ads (Patrocinios)
-- ==============================================================================

-- 1. ACTUALIZACIÓN DE TABLA: PRODUCTS
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_archetype TEXT DEFAULT 'RETAIL_STANDARD',
  ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS specs JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_confirm_stock BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_quota INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS regular_price_usd NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS aura_price_usd NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS unlock_fee_usd NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsored_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT now();

-- 2. ACTUALIZACIÓN DE TABLA: STORES
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'VITRINA_20',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS ad_credits_usd NUMERIC(10, 2) DEFAULT 0.00;

-- 3. ACTUALIZACIÓN DE TABLA: PROFILES
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wallet_credit_usd NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS vip_expires_at TIMESTAMPTZ;

-- 4. CREACIÓN DE TABLA: WALLET_TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  reservation_id UUID,
  amount_usd NUMERIC(10, 2) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('CREDIT_FROM_FIT_ISSUE', 'APPLIED_TO_UNLOCK', 'MANUAL_ADJUSTMENT')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Usuarios pueden ver sus transacciones" ON public.wallet_transactions
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Inserción de transacciones de billetera" ON public.wallet_transactions
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. CREACIÓN DE TABLA: LOST_DEMAND_LOGS
CREATE TABLE IF NOT EXISTS public.lost_demand_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT,
  category TEXT,
  selected_variant TEXT,
  customer_phone TEXT,
  reason VARCHAR(50) DEFAULT 'OUT_OF_STOCK',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lost_demand_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Comerciantes pueden ver su demanda perdida" ON public.lost_demand_logs
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Inserción de logs de demanda perdida" ON public.lost_demand_logs
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. ACTUALIZACIÓN DE TABLA: RESERVATIONS
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_status_check;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS unlock_fee_usd NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS store_pay_balance_usd NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS paid_with_wallet BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS category_archetype TEXT DEFAULT 'RETAIL_STANDARD',
  ADD COLUMN IF NOT EXISTS selected_variant JSONB DEFAULT '{}'::jsonb;

-- Constraint flexible compatible con V3 y Legacy
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_status_check CHECK (
    status IN (
      'PENDING_STOCK_CHECK',
      'STOCK_VERIFIED',
      'AWAITING_UNLOCK_PAYMENT',
      'QR_ACTIVE',
      'COMPLETED_IN_STORE',
      'ATTENDED_NO_SALE',
      'EXPIRED_NO_SHOW',
      'REJECTED_OUT_OF_STOCK',
      'pending',
      'confirmed',
      'completed',
      'cancelled',
      'expired',
      'pendiente',
      'confirmada',
      'ultimo_par',
      'cancelada',
      'completada',
      'expirada'
    )
  );

-- Índices de aceleración
CREATE INDEX IF NOT EXISTS idx_products_archetype ON public.products(category_archetype);
CREATE INDEX IF NOT EXISTS idx_reservations_status_v3 ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_wallet_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_lost_demand_store ON public.lost_demand_logs(store_id);

