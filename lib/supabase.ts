import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Browser Supabase client. Anonymous by default; after /api/auth we
 * swap the JWT into it so RLS sees the real Telegram-authenticated user.
 */
export function createBrowserSupabaseClient(token?: string | null): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const opts: Record<string, unknown> = {};

  if (token) {
    opts.global = {
      headers: { Authorization: `Bearer ${token}` }
    };
  } else {
    // If a token was persisted, attach it.
    try {
      const stored = globalThis.localStorage?.getItem("mt_token");
      if (stored) {
        opts.global = { headers: { Authorization: `Bearer ${stored}` } };
      }
    } catch {
      /* localStorage unavailable (SSR) — ignore */
    }
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    ...opts
  } as never);
}

/**
 * Server-side Supabase with the service role. NEVER import this into
 * client components — it must run only inside API routes / server code.
 */
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}