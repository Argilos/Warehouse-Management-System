import { createClient } from '@supabase/supabase-js';

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseKey: string = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. Check your frontend/.env file.\n' +
    'Required: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
