import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// These are public/publishable keys — safe to include in client bundle
// Vercel env vars (VITE_SUPABASE_URL etc.) override these at build time if set
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://dzmmqxwiknemzzahcidw.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6bW1xeHdpa25lbXp6YWhjaWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMDI5NTMsImV4cCI6MjA5MzY3ODk1M30.YKd-SLjfOTptAwGl5GgDW0CKoqHDRgwyTZuG8weL_4o';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
