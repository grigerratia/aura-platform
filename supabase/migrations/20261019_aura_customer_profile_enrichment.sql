-- ==============================================================================
-- AURA PLATFORM - PERFIL ENRIQUECIDO DE CLIENTES Y COMPRADORES
-- 1. Cédula de Identidad Obligatoria (id_doc)
-- 2. Dirección de Entrega / Referencia para Delivery y Retiro
-- 3. Teléfono secundario y Zona comercial habitual
-- 4. Categorías de interés multi-rubro y tallas opcionales para Cazador de Remates
-- ==============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS id_doc TEXT,
  ADD COLUMN IF NOT EXISTS zone TEXT DEFAULT 'Centro de Cumaná',
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS phone_alt TEXT,
  ADD COLUMN IF NOT EXISTS preferred_categories TEXT[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS shoe_size TEXT,
  ADD COLUMN IF NOT EXISTS clothing_size TEXT;

-- Actualizar trigger handle_new_aura_user para mapear id_doc y zone si vienen en metadata
CREATE OR REPLACE FUNCTION public.handle_new_aura_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, full_name, phone, role, wallet_credit_usd, trust_score,
    id_doc, zone, delivery_address, phone_alt, shoe_size, clothing_size
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario Aura'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    0.00,
    100,
    NEW.raw_user_meta_data->>'id_doc',
    COALESCE(NEW.raw_user_meta_data->>'favorite_zone', 'Centro de Cumaná'),
    NEW.raw_user_meta_data->>'delivery_address',
    NEW.raw_user_meta_data->>'phone_alt',
    NEW.raw_user_meta_data->>'preferred_shoe_size',
    NEW.raw_user_meta_data->>'preferred_clothing_size'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    id_doc = COALESCE(EXCLUDED.id_doc, profiles.id_doc),
    zone = COALESCE(EXCLUDED.zone, profiles.zone),
    delivery_address = COALESCE(EXCLUDED.delivery_address, profiles.delivery_address);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

