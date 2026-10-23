-- ==============================================================================
-- AURA PLATFORM - EL MEGÁFONO: TRAZABILIDAD DE PIN Y ESTADOS DE COMPLETADO
-- 1. Añade pin_code y reservation_id a megaphone_quotes si no existen
-- 2. Añade columna product_name a reservations para compatibilidad directa
-- 3. Actualiza el CHECK constraint de megaphone_quotes.status
-- ==============================================================================

-- 1. CAMPOS DE TRAZABILIDAD EN MEGAPHONE_QUOTES
ALTER TABLE public.megaphone_quotes
  ADD COLUMN IF NOT EXISTS pin_code TEXT,
  ADD COLUMN IF NOT EXISTS reservation_id UUID;

CREATE INDEX IF NOT EXISTS idx_megaphone_quotes_pin ON public.megaphone_quotes(pin_code);

-- 2. AMPLIAR CONSTRAINT DE ESTADOS EN MEGAPHONE_QUOTES
ALTER TABLE public.megaphone_quotes DROP CONSTRAINT IF EXISTS megaphone_quotes_status_check;

ALTER TABLE public.megaphone_quotes
  ADD CONSTRAINT megaphone_quotes_status_check CHECK (
    status IN ('SENT', 'ACCEPTED_BY_BUYER', 'REJECTED', 'COMPLETED', 'DELIVERED', 'CANCELLED')
  );

-- 3. ASEGURAR COLUMNA PRODUCT_NAME EN RESERVATIONS (Para evitar joins frágiles)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 4. ÍNDICE DE BÚSQUEDA RÁPIDA POR PIN_CODE EN RESERVATIONS
CREATE INDEX IF NOT EXISTS idx_reservations_pin_code_fast ON public.reservations(pin_code);

