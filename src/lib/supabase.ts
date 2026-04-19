// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Obtenemos las variables de tu archivo .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Exportamos el cliente para usarlo en toda la app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);