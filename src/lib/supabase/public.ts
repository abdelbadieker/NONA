import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Cookie-free anon client for PUBLIC reads (active catalog, public settings).
 * No cookies → results can be cached with `unstable_cache`, making navigation
 * fast. RLS still applies (anon role sees only active rows).
 */
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
