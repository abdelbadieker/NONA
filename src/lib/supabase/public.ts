import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Cookie-free anon client for PUBLIC reads (active catalog, public settings).
 * No cookies → results can be cached with `unstable_cache`, making navigation
 * fast. RLS still applies (anon role sees only active rows).
 */
export function createPublicClient() {
  return createClient<Database>(
    supabaseUrl(),
    supabaseAnonKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
