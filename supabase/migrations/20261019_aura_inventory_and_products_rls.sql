-- ==============================================================================
-- AURA PLATFORM - HABILITACIÓN DE POLÍTICAS RLS PARA PRODUCTOS E INVENTARIO
-- Soluciona:
-- 1. "new row violates row-level security policy for table products"
-- 2. Permite a los comercios crear, actualizar y gestionar productos, stock y fotos
-- 3. Habilita subida y lectura de imágenes en el bucket "product-images"
-- ==============================================================================

-- 1. TABLA: PRODUCTS (Catálogo Global)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Permitir lectura publica de productos" ON public.products
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir insertar productos" ON public.products
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir actualizar productos" ON public.products
    FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir eliminar productos" ON public.products
    FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- 2. TABLA: STORE_PRODUCTS (Inventario de cada Tienda)
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Permitir lectura publica de store_products" ON public.store_products
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir insertar store_products" ON public.store_products
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir actualizar store_products" ON public.store_products
    FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir eliminar store_products" ON public.store_products
    FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- 3. TABLA: RESERVATIONS (Reservas y Turnos de Compra)
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Permitir lectura de reservas" ON public.reservations
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir crear reservas" ON public.reservations
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir actualizar reservas" ON public.reservations
    FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- 4. BUCKET DE IMÁGENES: PRODUCT-IMAGES (Supabase Storage)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$ BEGIN
  CREATE POLICY "Permitir lectura publica de product-images" ON storage.objects
    FOR SELECT USING (bucket_id = 'product-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir subir imagenes a product-images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'product-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir actualizar imagenes en product-images" ON storage.objects
    FOR UPDATE USING (bucket_id = 'product-images') WITH CHECK (bucket_id = 'product-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
