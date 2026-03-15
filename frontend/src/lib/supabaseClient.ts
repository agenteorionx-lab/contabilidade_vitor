import { createClient } from '@supabase/supabase-js';

const sanitizeKey = (key: string | undefined) => {
  if (!key) return "";
  const trimmed = key.trim();
  if (trimmed.includes('=')) {
    return trimmed.split('=')[1].trim();
  }
  return trimmed;
};

const supabaseUrl = sanitizeKey(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = sanitizeKey(import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing. Cloud sync will be disabled.');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);
