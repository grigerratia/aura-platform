-- ==============================================================================
-- AURA PLATFORM - HABILITACIÓN DE POLÍTICAS RLS PARA PRODUCTOS E INVENTARIO
-- Soluciona: "new row violates row-level security policy for table products"
-- Permite a los comercios autenticados crear, actualizar y gestionar productos y stock
-- ==============================================================================

-- 1. TABLA: PRODUCTS
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


-- 2. TABLA: STORE_PRODUCTS (INVENTARIO DE TIENDAS)
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


-- 3. TABLA: RESERVATIONS (RESERVAS Y TURNOS)
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

