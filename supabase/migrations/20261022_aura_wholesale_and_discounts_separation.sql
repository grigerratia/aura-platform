-- ==============================================================================
-- AURA PLATFORM - DISTINCIÓN DE CANALES: RADAR VS RELÁMPAGO VS MANADAS
-- 1. Venta al Mayor (is_wholesale, wholesale_min_units, wholesale_price_usd) -> Manadas
-- 2. Descuentos y Ofertas Flash (has_discount) -> Relámpago (Excluidos de Radar)
-- ==============================================================================

-- 1. ACTUALIZAR TABLA PRODUCTS
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_wholesale BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS wholesale_min_units INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS wholesale_price_usd NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS has_discount BOOLEAN DEFAULT false;

-- 2. ACTUALIZAR TABLA STORE_PRODUCTS
ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS is_wholesale BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS wholesale_min_units INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS wholesale_price_usd NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS has_discount BOOLEAN DEFAULT false;

-- 3. ÍNDICES DE ACELERACIÓN DE FILTRADO POR MODALIDAD
CREATE INDEX IF NOT EXISTS idx_products_is_wholesale ON public.products(is_wholesale);
CREATE INDEX IF NOT EXISTS idx_products_has_discount ON public.products(has_discount);
CREATE INDEX IF NOT EXISTS idx_store_products_is_wholesale ON public.store_products(is_wholesale);
CREATE INDEX IF NOT EXISTS idx_store_products_has_discount ON public.store_products(has_discount);
