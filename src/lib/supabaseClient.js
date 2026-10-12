import { createClient } from '@supabase/supabase-js';

// 1. .env file se keys read karna:
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Error Guard (Safety check):
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables (URL or Anon Key) are missing!');
}

// 3. Central Client banana (With Persistent Auth & Realtime Channels):
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
});