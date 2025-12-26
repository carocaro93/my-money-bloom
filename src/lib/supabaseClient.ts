import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Prendiamo le chiavi dalle variabili d'ambiente di Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verifica che le variabili siano configurate
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL o Anon Key mancanti. Assicurati che VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY siano configurate.');
}

// Creiamo un oggetto "supabase" che useremo nel resto dell'app
export const supabase: SupabaseClient = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);
