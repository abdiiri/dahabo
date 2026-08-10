// SERVER-ONLY. This file lives under lib/server/ so the app's Vite config
// (see importProtection in vite.config.ts) refuses to bundle it into client
// code — the service role key it uses can bypass Row Level Security, so it
// must never reach the browser.
//
// Only import this from inside a createServerFn `.handler()`, and prefer a
// dynamic `await import(...)` there so it's never statically pulled into a
// route's client chunk.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * A Supabase client authenticated with the service role key. Requires
 * SUPABASE_SERVICE_ROLE_KEY (and SUPABASE_URL or VITE_SUPABASE_URL) to be
 * set as real server environment variables — NOT prefixed with VITE_, or
 * they'd be exposed to the browser. See docs/SUPABASE_SETUP.md.
 */
export function getAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured on the server. Add it to your server environment " +
        "(never with a VITE_ prefix) so admins can create driver logins — see docs/SUPABASE_SETUP.md.",
    );
  }

  if (!cached) {
    cached = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cached;
}
