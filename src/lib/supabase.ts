import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True once VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are both set. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * The Supabase client, or `null` when no project is connected yet.
 * Every module in `src/lib/api/*` checks this and falls back to a local
 * (browser-only) demo store so the UI keeps working before you connect a
 * real database. See docs/SUPABASE_SETUP.md.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;

if (!isSupabaseConfigured && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.info(
    "[Dahabo] No Supabase project connected — running in local demo mode. " +
      "See docs/SUPABASE_SETUP.md to connect a real database.",
  );
}
