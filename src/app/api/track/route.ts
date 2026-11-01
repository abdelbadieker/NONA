import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientFingerprint, rateLimit } from "@/lib/rate-limit";
import { pageViewSchema } from "@/lib/validation";

/**
 * First-party page-view beacon (no cookies; a random per-tab session id).
 * Feeds the dashboard's visits / conversion figures. Rate-limited and
 * validated; stores path, locale, session id and the external referrer only.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = pageViewSchema.safeParse(body);
  if (!parsed.success) return new Response(null, { status: 400 });
  if (!(await rateLimit(`pv:${await clientFingerprint()}`, 120, 600))) return new Response(null, { status: 429 });

  const d = parsed.data;
  let referrer: string | null = null;
  try {
    if (d.referrer) {
      const u = new URL(d.referrer);
      referrer = u.host === req.nextUrl.host ? null : `${u.protocol}//${u.host}${u.pathname}`.slice(0, 300);
    }
  } catch {}

  const supabase = createAdminClient();
  const { error } = await supabase.from("analytics").insert({
    event_type: "page_view",
    path: d.path.split("?")[0],
    locale: d.path.split("/")[1],
    session_id: d.sessionId,
    metadata: referrer ? { referrer } : {},
  });
  if (error) console.error("[track]", error.message);
  return new Response(null, { status: 204 });
}
