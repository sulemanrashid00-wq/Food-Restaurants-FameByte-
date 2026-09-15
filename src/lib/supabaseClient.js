import { createClient } from '@supabase/supabase-js';

// 1. .env file se keys read karna:
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Error Guard (Safety check):
// Agar keys daalna bhool gaye to app crash hone ke bajaye error throw kare:
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables (URL or Anon Key) are missing!');
}

// 3. Central Client banana:
// createClient function dono keys use karke database se live connection link bana deta hai
export const supabase = createClient(supabaseUrl, supabaseAnonKey);