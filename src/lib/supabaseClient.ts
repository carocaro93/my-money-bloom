import { createClient } from '@supabase/supabase-js';

// Prendiamo le chiavi dalle variabili d'ambiente di Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Creiamo un oggetto "supabase" che useremo nel resto dell'app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
