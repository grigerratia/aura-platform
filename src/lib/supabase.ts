// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Obtenemos las variables de tu archivo .env.local con fallback para evitar caídas durante compilación
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yzjxskbmcmzmipggwfop.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_zP2h7DGfpcWN_W1RukXw7A_SxlGTvbe';

// Exportamos el cliente para usarlo en toda la app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);