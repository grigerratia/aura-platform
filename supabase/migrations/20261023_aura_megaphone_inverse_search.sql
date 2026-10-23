-- ==============================================================================
-- AURA PLATFORM - EL MEGÁFONO (BÚSQUEDA INVERSA EN TIEMPO REAL)
-- 1. Tabla: megaphone_requests (Solicitudes de clientes en Radar)
-- 2. Tabla: megaphone_quotes (Cotizaciones rápidas e incógnitas de vitrinas)
-- 3. Control de cuotas B2B y sectorización en stores
-- 4. Habilitación en Supabase Realtime y RLS
-- ==============================================================================

-- 1. TABLA: MEGAPHONE_REQUESTS
CREATE TABLE IF NOT EXISTS public.megaphone_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  query_text TEXT NOT NULL,
  category_id TEXT NOT NULL,
  city TEXT DEFAULT 'Cumaná',
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'LOCKED_WINNER', 'EXPIRED', 'CANCELLED')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_megaphone_requests_status ON public.megaphone_requests(status);
CREATE INDEX IF NOT EXISTS idx_megaphone_requests_category ON public.megaphone_requests(category_id);
CREATE INDEX IF NOT EXISTS idx_megaphone_requests_created ON public.megaphone_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_megaphone_requests_user ON public.megaphone_requests(user_id);

-- 2. TABLA: MEGAPHONE_QUOTES
CREATE TABLE IF NOT EXISTS public.megaphone_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.megaphone_requests(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  price_usd NUMERIC(10, 2) NOT NULL,
  quick_note VARCHAR(90),
  photo_url TEXT,
  auto_seeded_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'ACCEPTED_BY_BUYER', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_quote_per_store_request UNIQUE (request_id, store_id)
);

-- Índices de cotizaciones
CREATE INDEX IF NOT EXISTS idx_megaphone_quotes_request ON public.megaphone_quotes(request_id);
CREATE INDEX IF NOT EXISTS idx_megaphone_quotes_store ON public.megaphone_quotes(store_id);
CREATE INDEX IF NOT EXISTS idx_megaphone_quotes_status ON public.megaphone_quotes(status);

-- 3. CAMPOS DE CONTROL B2B Y ZONA INCÓGNITO EN STORES
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS megaphone_quota_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sector_zone TEXT DEFAULT 'Centro';

-- 4. HABILITACIÓN EN SUPABASE REALTIME
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.megaphone_requests;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.megaphone_quotes;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;

-- 5. SEGURIDAD Y ROW LEVEL SECURITY (RLS)
ALTER TABLE public.megaphone_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.megaphone_quotes ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso para megaphone_requests
DO $$ BEGIN
  CREATE POLICY "Lectura pública de solicitudes abiertas de megáfono"
    ON public.megaphone_requests FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir crear solicitudes de megáfono"
    ON public.megaphone_requests FOR INSERT
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir actualizar estado de solicitudes de megáfono"
    ON public.megaphone_requests FOR UPDATE
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Políticas de acceso para megaphone_quotes
DO $$ BEGIN
  CREATE POLICY "Lectura pública de cotizaciones de megáfono"
    ON public.megaphone_quotes FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir a tiendas insertar cotizaciones de megáfono"
    ON public.megaphone_quotes FOR INSERT
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir actualizar cotizaciones de megáfono"
    ON public.megaphone_quotes FOR UPDATE
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

