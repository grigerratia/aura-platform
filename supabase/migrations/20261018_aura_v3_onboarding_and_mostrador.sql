-- ==============================================================================
-- AURA PLATFORM - ONBOARDING B2B & MODO MOSTRADOR (DUEÑO VS CAJERO)
-- 1. Estado de Verificación Rápida en stores (DRAFT_UNVERIFIED, PENDING_REVIEW, VERIFIED, SUSPENDED)
-- 2. Foto de fachada, RIF/Cédula e Instagram para verificación en 1 minuto
-- 3. PIN de Acceso de Mostrador (cashier_access_pin) para empleados
-- ==============================================================================

-- 1. CAMPOS EN TABLA STORES
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'DRAFT_UNVERIFIED',
  ADD COLUMN IF NOT EXISTS storefront_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS rif_or_id_number TEXT,
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
  ADD COLUMN IF NOT EXISTS cashier_access_pin VARCHAR(6) DEFAULT '1234';

-- Actualizar tiendas existentes previamente a 'VERIFIED' para que se mantengan visibles
UPDATE public.stores 
SET verification_status = 'VERIFIED' 
WHERE verification_status IS NULL;

-- Constraint de verificación
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_verification_status_check;
ALTER TABLE public.stores ADD CONSTRAINT stores_verification_status_check CHECK (
  verification_status IN ('DRAFT_UNVERIFIED', 'PENDING_REVIEW', 'VERIFIED', 'SUSPENDED')
);

-- Políticas RLS para lectura pública de tiendas y acceso a mostrador
DO $$ BEGIN
  CREATE POLICY "Permitir consultar tienda por id para mostrador" ON public.stores
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Permitir actualizar reservas desde el mostrador (confirmar stock, marcar entrega o liberar stock)
DO $$ BEGIN
  CREATE POLICY "Permitir actualizar reservas desde mostrador" ON public.reservations
    FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
