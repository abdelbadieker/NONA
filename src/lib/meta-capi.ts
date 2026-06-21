import "server-only";
import crypto from "node:crypto";

const sha256 = (s: string) =>
  crypto.createHash("sha256").update(s.trim().toLowerCase()).digest("hex");

/** Normalize an Algerian phone to digits with country code (e.g. 0661… → 213661…). */
function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = `213${p.slice(1)}`;
  else if (!p.startsWith("213")) p = `213${p}`;
  return p;
}

/**
 * Send a server-side Purchase to the Meta Conversions API. Best-effort:
 * never throws. Use the same event_id as the browser pixel for deduplication.
 */
export async function sendMetaPurchase(opts: {
  pixelId: string;
  token: string;
  eventId: string;
  value: number;
  currency: string;
  contentIds: string[];
  numItems: number;
  phone?: string;
  clientIp?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
}): Promise<void> {
  if (!opts.pixelId || !opts.token) return;

  const userData: Record<string, unknown> = {};
  if (opts.phone) userData.ph = [sha256(normalizePhone(opts.phone))];
  if (opts.clientIp) userData.client_ip_address = opts.clientIp;
  if (opts.userAgent) userData.client_user_agent = opts.userAgent;
  if (opts.fbp) userData.fbp = opts.fbp;
  if (opts.fbc) userData.fbc = opts.fbc;

  const body = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: opts.eventId,
        action_source: "website",
        event_source_url: opts.eventSourceUrl,
        user_data: userData,
        custom_data: {
          currency: opts.currency,
          value: opts.value,
          content_ids: opts.contentIds,
          content_type: "product",
          num_items: opts.numItems,
        },
      },
    ],
  };

  try {
    await fetch(
      `https://graph.facebook.com/v21.0/${opts.pixelId}/events?access_token=${encodeURIComponent(opts.token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
  } catch {
    // Tracking must never break checkout.
  }
}
