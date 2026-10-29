import "server-only";
import crypto from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limit backed by public.hit_rate_limit (shared across
 * serverless instances). Returns true when the request is allowed.
 * Fails open on infrastructure errors so a DB hiccup never blocks sales —
 * the database-level guards (e.g. orders per phone) still apply.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("hit_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[rate-limit]", error.message);
      return true;
    }
    return data === true;
  } catch (err) {
    console.error("[rate-limit]", err);
    return true;
  }
}

/** Salted hash of the client IP — raw IPs are never stored. */
export async function clientFingerprint(): Promise<string> {
  const h = await headers();
  const ip =
    (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim() || "unknown";
  const salt = process.env.RATE_LIMIT_SALT ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "nona";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}
