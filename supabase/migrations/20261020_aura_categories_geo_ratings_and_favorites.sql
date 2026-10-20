-- ==============================================================================
-- AURA PLATFORM - MIGRACIÓN: CATEGORÍAS UNIVERSALES, GEO-DISTANCIA, ATENCIÓN Y FAVORITOS
-- 1. 9 Categorías Oficiales: Moda, Tecno, Hogar, Juguetes, Ferretería, Farmacia, Comida, Bienestar, Vehículos
-- 2. Coordenadas GPS y Métricas de Calidad de Atención (Estrellas) en STORES
-- 3. Tabla STORE_FAVORITES (Tiendas Seguidas / Favoritas del Usuario)
-- 4. Tabla STORE_REVIEWS (Valoraciones de Servicio)
-- ==============================================================================

-- 1. ACTUALIZACIÓN DE TABLA: STORES
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 4.85,
  ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 16,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7) DEFAULT 10.453900,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7) DEFAULT -64.182600,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Moda';

-- 2. ACTUALIZACIÓN DE TABLA: PRODUCTS
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- 3. CREACIÓN DE TABLA: STORE_FAVORITES (Mis Tiendas Seguidas)
CREATE TABLE IF NOT EXISTS public.store_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, store_id)
);

ALTER TABLE public.store_favorites ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Permitir lectura publica de store_favorites" ON public.store_favorites
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir insertar store_favorites" ON public.store_favorites
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir eliminar store_favorites" ON public.store_favorites
    FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- 4. CREACIÓN DE TABLA: STORE_REVIEWS (Calificaciones de Atención)
CREATE TABLE IF NOT EXISTS public.store_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Permitir lectura publica de store_reviews" ON public.store_reviews
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir insertar store_reviews" ON public.store_reviews
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. PERMISOS Y LICENCIAS DE ACCESO (GRANTS)
GRANT ALL ON public.store_favorites TO authenticated, anon;
GRANT ALL ON public.store_reviews TO authenticated, anon;

-- 6. ACTUALIZAR TIENDAS EXISTENTES CON COORDENADAS REFERENCIALES EN CUMANÁ, RATING Y STATUS VERIFIED
UPDATE public.stores
SET 
  latitude = 10.453900 + (random() * 0.015 - 0.007),
  longitude = -64.182600 + (random() * 0.015 - 0.007),
  rating = COALESCE(rating, 4.85),
  reviews_count = COALESCE(reviews_count, 18),
  verification_status = 'VERIFIED'
WHERE latitude IS NULL OR longitude IS NULL OR verification_status = 'DRAFT_UNVERIFIED';
