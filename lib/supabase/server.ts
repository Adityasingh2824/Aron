import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { publicSupabaseConfig } from './config';

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = publicSupabaseConfig();
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(items) {
        try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Server Components cannot set cookies; proxy refreshes them. */ }
      },
    },
  });
}

export function createServiceClient() {
  const { url } = publicSupabaseConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error('Supabase server key is not configured');
  return createAdminClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function authenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;
  return { supabase, userId };
}
