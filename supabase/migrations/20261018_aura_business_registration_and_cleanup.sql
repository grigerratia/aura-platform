-- ==============================================================================
-- AURA BUSINESS: REGISTRO DE COMERCIOS, POLÍTICAS RLS Y LIMPIEZA DE PRODUCTOS
-- ==============================================================================

-- 1. ACTUALIZACIÓN DE TABLA: STORES
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS zone TEXT DEFAULT 'Centro de Cumaná',
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS reference_point TEXT,
  ADD COLUMN IF NOT EXISTS rif TEXT,
  ADD COLUMN IF NOT EXISTS schedule TEXT DEFAULT 'Lunes a Sábado de 8:30 AM a 5:30 PM',
  ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT ARRAY['Punto de Venta', 'Pago Móvil']::text[],
  ADD COLUMN IF NOT EXISTS pago_movil_info JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS has_delivery BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. HABILITACIÓN DE RLS Y POLÍTICAS PERMISIVAS PARA STORES
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Permitir lectura publica de tiendas" ON public.stores
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir registrar tiendas" ON public.stores
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir actualizar tiendas" ON public.stores
    FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. HABILITACIÓN DE RLS Y POLÍTICAS PERMISIVAS PARA PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Permitir lectura de perfiles" ON public.profiles
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Permitir a usuarios gestionar su perfil" ON public.profiles
    FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. TRIGGER AUTOMÁTICO DE PERFILES (Para evitar que usuarios sin perfil queden bloqueados)
CREATE OR REPLACE FUNCTION public.handle_new_aura_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role, wallet_credit_usd, trust_score)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Comerciante Aura'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'owner'),
    0.00,
    100
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparador en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_aura_user();

-- ==============================================================================
-- 5. LIMPIEZA DE PRODUCTOS DEMO (EJECUTAR SI DESEAS BORRAR TODOS LOS PRODUCTOS)
-- ==============================================================================
-- Descomenta las 3 líneas siguientes si quieres vaciar por completo el catálogo:
-- TRUNCATE TABLE public.store_products CASCADE;
-- TRUNCATE TABLE public.reservations CASCADE;
-- DELETE FROM public.products;
