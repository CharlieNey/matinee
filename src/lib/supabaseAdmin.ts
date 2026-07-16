import { createClient, SupabaseClient } from "@supabase/supabase-js";

/** True when the server has what it needs to persist push subscriptions. */
export function pushBackendConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

let client: SupabaseClient | null = null;

/**
 * Server-only Supabase client using the secret key (legacy service_role also
 * works). Never import from client components — the key bypasses RLS.
 */
export function supabaseAdmin(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
    }
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
