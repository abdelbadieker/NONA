"use server";

import { clientFingerprint, rateLimit } from "@/lib/rate-limit";
import { findOrderForCustomer, type TrackedOrder } from "@/lib/data/tracking";
import { trackOrderSchema } from "@/lib/validation";

export type TrackResult =
  | { ok: true; order: TrackedOrder }
  | { ok: false; error: "validation" | "not_found" | "rate" };

/**
 * Customer order lookup. Requires order number AND checkout phone, is rate
 * limited per client, and returns the same error for "wrong number" and
 * "wrong phone" so it can't be used to probe which orders exist.
 */
export async function trackOrder(input: { orderNumber: string | number; phone: string }): Promise<TrackResult> {
  const parsed = trackOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  if (!(await rateLimit(`track:${await clientFingerprint()}`, 10, 600))) {
    return { ok: false, error: "rate" };
  }

  const order = await findOrderForCustomer(parsed.data.orderNumber, parsed.data.phone);
  return order ? { ok: true, order } : { ok: false, error: "not_found" };
}
