import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { supabaseAnonKey, supabaseUrl } from "./env";

/** Supabase client for use in Client Components (browser). Respects RLS. */
export function createClient() {
  return createBrowserClient<Database>(
    supabaseUrl(),
    supabaseAnonKey(),
  );
}
