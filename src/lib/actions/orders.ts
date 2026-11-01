"use server";

import { revalidatePath, updateTag } from "next/cache";
import { cookies, headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorize, getSessionUser, type Staff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientFingerprint, rateLimit } from "@/lib/rate-limit";
import { getMarketingServer } from "@/lib/data/marketing";
import { sendMetaPurchase } from "@/lib/meta-capi";
import { revalidateStore } from "@/lib/actions/revalidate";
import { SITE_URL } from "@/lib/site";
import { isLocale } from "@/i18n/config";
import {
  callLogSchema,
  checkoutInputSchema,
  codUpdateSchema,
  deliveryAttemptSchema,
  orderDetailsSchema,
  orderFlagSchema,
  orderNoteSchema,
  quoteInputSchema,
  shipmentSchema,
  type CheckoutInput,
  type QuoteInput,
} from "@/lib/validation";
import { ORDER_STATUSES } from "@/lib/order-status";
import { deriveAdSource } from "@/lib/attribution";
import type { OrderStatus } from "@/lib/types";

const siteHost = () => {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return undefined;
  }
};

// ── Storefront: quote & checkout ─────────────────────────

export type QuoteLine = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantLabel: string | null;
  imageUrl: string | null;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  stock: number;
};

export type Quote = {
  lines: QuoteLine[];
  itemCount: number;
  subtotal: number;
  discount: { code: string | null; title: string; kind: string; amount: number } | null;
  discountError: string | null;
  discountAmount: number;
  freeShipping: boolean;
  freeShippingReason: "discount" | "threshold" | null;
  deliveryFee: number | null;
  deliveryFeeOriginal: number | null;
  total: number;
};

export type QuoteResult =
  | { ok: true; quote: Quote }
  | { ok: false; error: string; variantId?: string; available?: number };

type RpcLine = {
  variant_id: string;
  product_id: string;
  slug: string;
  name: string;
  variant_label: string | null;
  image_url: string | null;
  unit_price: number;
  qty: number;
  line_total: number;
  stock: number;
};

const num = (v: unknown) => (v == null ? null : Number(v));

function mapQuote(r: Record<string, unknown>): Quote {
  const d = r.discount as Record<string, unknown> | null;
  return {
    lines: ((r.lines as RpcLine[]) ?? []).map((l) => ({
      variantId: l.variant_id,
      productId: l.product_id,
      slug: l.slug,
      name: l.name,
      variantLabel: l.variant_label,
      imageUrl: l.image_url,
      unitPrice: Number(l.unit_price),
      qty: Number(l.qty),
      lineTotal: Number(l.line_total),
      stock: Number(l.stock),
    })),
    itemCount: Number(r.item_count ?? 0),
    subtotal: Number(r.subtotal ?? 0),
    discount: d
      ? {
          code: (d.code as string) ?? null,
          title: String(d.title ?? ""),
          kind: String(d.kind ?? ""),
          amount: Number(d.amount ?? 0),
        }
      : null,
    discountError: (r.discount_error as string) ?? null,
    discountAmount: Number(r.discount_amount ?? 0),
    freeShipping: Boolean(r.free_shipping),
    freeShippingReason: (r.free_shipping_reason as Quote["freeShippingReason"]) ?? null,
    deliveryFee: num(r.delivery_fee),
    deliveryFeeOriginal: num(r.delivery_fee_original),
    total: Number(r.total ?? 0),
  };
}

/**
 * Authoritative price quote for the cart/checkout (prices, stock, discount,
 * delivery fee all computed in the database). The browser never supplies
 * prices or totals.
 */
export async function quoteCart(input: QuoteInput): Promise<QuoteResult> {
  const parsed = quoteInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const d = parsed.data;

  // Discount codes can be brute-forced through quotes; keep it bounded.
  if (!(await rateLimit(`quote:${await clientFingerprint()}`, 60, 60))) {
    return { ok: false, error: "rate" };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("quote_order", {
    p: {
      items: d.items.map((i) => ({ variant_id: i.variantId, qty: i.qty })),
      wilaya_code: d.wilayaCode ?? null,
      delivery_type: d.deliveryType,
      discount_code: d.discountCode || null,
      locale: d.locale,
    },
  });
  if (error || !data) {
    console.error("[quoteCart]", error?.message);
    return { ok: false, error: "generic" };
  }
  const r = data as Record<string, unknown>;
  if (!r.ok) {
    return {
      ok: false,
      error: String(r.error),
      variantId: r.variant_id as string | undefined,
      available: r.available as number | undefined,
    };
  }
  return { ok: true, quote: mapQuote(r) };
}

export type PlaceOrderResult =
  | {
      ok: true;
      orderNumber: number;
      publicToken: string;
      eventId: string;
      productIds: string[];
      value: number;
      numItems: number;
    }
  | {
      ok: false;
      error:
        | "validation"
        | "rate"
        | "stock"
        | "unavailable"
        | "wilaya"
        | "discount"
        | "generic";
      reason?: string;
    };

/**
 * Places a COD order (status not_confirmed). One database transaction does
 * pricing, discount usage, customer upsert, order + items + timeline.
 * Retrying with the same idempotency key returns the same order.
 * Stock is committed later, when staff confirm the order.
 */
export async function placeOrder(input: CheckoutInput): Promise<PlaceOrderResult> {
  const parsed = checkoutInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const d = parsed.data;

  if (!(await rateLimit(`checkout:${await clientFingerprint()}`, 10, 600))) {
    return { ok: false, error: "rate" };
  }

  const user = await getSessionUser().catch(() => null);
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("create_order", {
    p: {
      items: d.items.map((i) => ({ variant_id: i.variantId, qty: i.qty })),
      wilaya_code: d.wilayaCode,
      delivery_type: d.deliveryType,
      discount_code: d.discountCode || null,
      locale: d.locale,
      idempotency_key: d.idempotencyKey,
      user_id: user?.id ?? null,
      utm: d.utm ?? null,
      ad_source: deriveAdSource(d.utm, siteHost()),
      source: d.source ?? "cart",
      customer: {
        name: d.customerName,
        phone: d.customerPhone,
        phone2: d.customerPhone2 || null,
        commune: d.commune || null,
        address: d.address,
        notes: d.notes || null,
        accepts_marketing: d.acceptsMarketing ?? false,
      },
    },
  });

  if (error || !data) {
    console.error("[placeOrder] rpc error", error?.message);
    return { ok: false, error: "generic" };
  }
  const r = data as Record<string, unknown>;
  if (!r.ok) {
    const e = String(r.error);
    const map: Record<string, Extract<PlaceOrderResult, { ok: false }>["error"]> = {
      out_of_stock: "stock",
      unavailable: "unavailable",
      invalid_qty: "validation",
      invalid_customer: "validation",
      empty: "validation",
      wilaya_unavailable: "wilaya",
      delivery_type_unavailable: "wilaya",
      discount: "discount",
      rate: "rate",
      // Blocked numbers get the generic error: never reveal the blocklist.
      blocked: "generic",
    };
    return { ok: false, error: map[e] ?? "generic", reason: r.reason as string | undefined };
  }

  const orderId = String(r.order_id);
  const lines = (r.lines as { product_id: string; qty: number }[]) ?? [];
  const productIds = [...new Set(lines.map((l) => l.product_id))];
  const numItems = lines.reduce((s, l) => s + Number(l.qty), 0);
  const total = Number(r.total);
  // Deterministic id: a retried submission can never produce a second Purchase.
  const eventId = `order-${orderId}`;

  if (!r.duplicate) {
    await supabase
      .from("analytics")
      .insert({
        event_type: "order_placed",
        locale: d.locale,
        order_id: orderId,
        product_id: productIds[0] ?? null,
        metadata: { total, items: numItems, wilaya: d.wilayaCode, source: d.source ?? "cart" },
      })
      .then(({ error: e }) => e && console.error("[placeOrder] analytics", e.message));

    try {
      const mkt = await getMarketingServer();
      if (mkt.metaPixelId && mkt.metaCapiToken) {
        const hdrs = await headers();
        const cookieStore = await cookies();
        await sendMetaPurchase({
          pixelId: mkt.metaPixelId,
          token: mkt.metaCapiToken,
          eventId,
          value: total,
          currency: "DZD",
          contentIds: productIds,
          numItems,
          phone: d.customerPhone,
          clientIp:
            (hdrs.get("x-forwarded-for")?.split(",")[0] ?? hdrs.get("x-real-ip") ?? "").trim() ||
            undefined,
          userAgent: hdrs.get("user-agent") ?? undefined,
          fbp: cookieStore.get("_fbp")?.value,
          fbc: cookieStore.get("_fbc")?.value,
          eventSourceUrl: `${SITE_URL}/${d.locale}/checkout`,
        });
      }
    } catch (err) {
      console.error("[placeOrder] capi", err); // never block checkout on tracking
    }
  }

  return {
    ok: true,
    orderNumber: Number(r.order_number),
    publicToken: String(r.public_token),
    eventId,
    productIds,
    value: total,
    numItems,
  };
}

// ── Admin: order operations ──────────────────────────────

type ActionResult = { ok: true } | { ok: false; error: string };

const langOf = (lang: string) => (isLocale(lang) ? lang : "ar");

function revalidateOrder(lang: string, orderId: string) {
  const l = langOf(lang);
  revalidatePath(`/${l}/admin/orders/${orderId}`);
  revalidatePath(`/${l}/admin/orders`);
  revalidatePath(`/${l}/admin`);
}

async function addEvent(
  orderId: string,
  staff: Staff,
  type: string,
  message: string | null,
  data: Record<string, unknown> = {},
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("order_events")
    .insert({ order_id: orderId, type, message, data, actor_id: staff.id });
  if (error) console.error("[order_events]", error.message);
}

/** Staff status change: the database enforces the transition and moves stock. */
export async function setOrderStatus(input: {
  orderId: string;
  status: OrderStatus;
  reasonId?: string | null;
  lang: string;
}): Promise<ActionResult> {
  const staff = await authorize("orders.manage");
  if (!staff) return { ok: false, error: "forbidden" };
  if (!ORDER_STATUSES.includes(input.status)) return { ok: false, error: "validation" };

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("admin_set_order_status", {
    p_order: input.orderId,
    p_status: input.status,
    p_reason: input.reasonId || null,
    p_actor: staff.id,
  });
  const r = (data ?? {}) as Record<string, unknown>;
  if (error || !r.ok) {
    const code = error ? "generic" : String(r.error);
    await audit(staff, "order.status", "order", input.orderId, { to: input.status, error: code }, "failure");
    return { ok: false, error: code };
  }

  await audit(staff, "order.status", "order", input.orderId, { from: r.from, to: input.status });
  updateTag("catalog");
  revalidateStore();
  revalidateOrder(input.lang, input.orderId);
  return { ok: true };
}

export async function addOrderNote(input: { orderId: string; message: string; lang: string }): Promise<ActionResult> {
  const staff = await authorize("orders.manage");
  if (!staff) return { ok: false, error: "forbidden" };
  const parsed = orderNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  await addEvent(parsed.data.orderId, staff, "note", parsed.data.message);
  revalidateOrder(input.lang, parsed.data.orderId);
  return { ok: true };
}

/** COD confirmation workflow: record each call attempt and its outcome. */
export async function logCallAttempt(input: {
  orderId: string;
  outcome: string;
  note?: string;
  lang: string;
}): Promise<ActionResult> {
  const staff = await authorize("orders.manage");
  if (!staff) return { ok: false, error: "forbidden" };
  const parsed = callLogSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const d = parsed.data;

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("call_attempts")
    .eq("id", d.orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "not_found" };

  const { error } = await supabase
    .from("orders")
    .update({
      call_attempts: Number(order.call_attempts ?? 0) + 1,
      last_call_at: new Date().toISOString(),
      last_call_outcome: d.outcome,
    })
    .eq("id", d.orderId);
  if (error) return { ok: false, error: "generic" };

  await addEvent(d.orderId, staff, "call", d.note || null, { outcome: d.outcome });
  await audit(staff, "order.call", "order", d.orderId, { outcome: d.outcome });
  revalidateOrder(input.lang, d.orderId);
  return { ok: true };
}

export async function updateShipment(input: {
  orderId: string;
  carrier: string;
  trackingNumber: string;
  lang: string;
}): Promise<ActionResult> {
  const staff = await authorize("orders.manage");
  if (!staff) return { ok: false, error: "forbidden" };
  const parsed = shipmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const d = parsed.data;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ carrier: d.carrier || null, tracking_number: d.trackingNumber || null })
    .eq("id", d.orderId);
  if (error) return { ok: false, error: "generic" };

  await addEvent(d.orderId, staff, "shipment", null, {
    carrier: d.carrier,
    tracking_number: d.trackingNumber,
  });
  await audit(staff, "order.shipment", "order", d.orderId, { carrier: d.carrier });
  revalidateOrder(input.lang, d.orderId);
  return { ok: true };
}

/** A failed delivery attempt (order stays in delivery; staff decide next step). */
export async function logDeliveryAttempt(input: {
  orderId: string;
  reason: string;
  note?: string;
  lang: string;
}): Promise<ActionResult> {
  const staff = await authorize("orders.manage");
  if (!staff) return { ok: false, error: "forbidden" };
  const parsed = deliveryAttemptSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const d = parsed.data;

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("status, delivery_attempts")
    .eq("id", d.orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "not_found" };
  if (order.status !== "in_delivery") return { ok: false, error: "invalid_state" };

  const { error } = await supabase
    .from("orders")
    .update({ delivery_attempts: Number(order.delivery_attempts ?? 0) + 1 })
    .eq("id", d.orderId);
  if (error) return { ok: false, error: "generic" };

  await addEvent(d.orderId, staff, "delivery_attempt", d.note || null, { reason: d.reason });
  await audit(staff, "order.delivery_attempt", "order", d.orderId, { reason: d.reason });
  revalidateOrder(input.lang, d.orderId);
  return { ok: true };
}

/**
 * COD money movements, each a guarded state change:
 *   collected — carrier reports cash collected (amount may differ from total)
 *   settled   — carrier paid the store
 *   refunded  — money returned to the customer (needs orders.refund)
 */
export async function updateCod(input: {
  orderId: string;
  action: "collected" | "settled" | "refunded";
  amount?: number;
  lang: string;
}): Promise<ActionResult> {
  const parsed = codUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const d = parsed.data;
  const staff = await authorize(d.action === "refunded" ? "orders.refund" : "orders.manage");
  if (!staff) return { ok: false, error: "forbidden" };

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("status, payment_status, total")
    .eq("id", d.orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "not_found" };

  const now = new Date().toISOString();
  let from: string[];
  let patch: Record<string, unknown>;
  if (d.action === "collected") {
    if (!["in_delivery", "delivered"].includes(order.status)) return { ok: false, error: "invalid_state" };
    from = ["pending", "collected"];
    patch = {
      payment_status: "collected",
      cod_collected_amount: d.amount ?? Number(order.total),
      cod_collected_at: now,
    };
  } else if (d.action === "settled") {
    from = ["collected"];
    patch = { payment_status: "settled", cod_settled_at: now };
  } else {
    if (order.status !== "returned") return { ok: false, error: "invalid_state" };
    from = ["collected", "settled"];
    patch = { payment_status: "refunded" };
  }
  if (!from.includes(order.payment_status)) return { ok: false, error: "invalid_state" };

  // Compare-and-set on payment_status so two clicks can't apply twice.
  const { data: updated, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", d.orderId)
    .eq("payment_status", order.payment_status)
    .select("id");
  if (error) return { ok: false, error: "generic" };
  if (!updated?.length) return { ok: false, error: "conflict" };

  await addEvent(d.orderId, staff, "payment", null, {
    action: d.action,
    from: order.payment_status,
    amount: patch.cod_collected_amount ?? null,
  });
  await audit(staff, `order.cod.${d.action}`, "order", d.orderId, {
    from: order.payment_status,
    amount: patch.cod_collected_amount ?? null,
  });
  revalidateOrder(input.lang, d.orderId);
  return { ok: true };
}

export async function setOrderFlag(input: {
  orderId: string;
  flagged: boolean;
  reason?: string;
  lang: string;
}): Promise<ActionResult> {
  const staff = await authorize("orders.manage");
  if (!staff) return { ok: false, error: "forbidden" };
  const parsed = orderFlagSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const d = parsed.data;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ flagged: d.flagged, flag_reason: d.flagged ? d.reason || "manual_review" : null })
    .eq("id", d.orderId);
  if (error) return { ok: false, error: "generic" };
  await addEvent(d.orderId, staff, "flag", d.reason || null, { flagged: d.flagged });
  await audit(staff, "order.flag", "order", d.orderId, { flagged: d.flagged });
  revalidateOrder(input.lang, d.orderId);
  return { ok: true };
}

/** Spam orders are hidden from the default list and excluded from metrics. */
export async function setOrderSpam(input: { orderId: string; spam: boolean; lang: string }): Promise<ActionResult> {
  const staff = await authorize("orders.manage");
  if (!staff) return { ok: false, error: "forbidden" };
  const supabase = createAdminClient();
  const { error } = await supabase.from("orders").update({ is_spam: input.spam }).eq("id", input.orderId);
  if (error) return { ok: false, error: "generic" };
  await addEvent(input.orderId, staff, "flag", null, { spam: input.spam });
  await audit(staff, input.spam ? "order.spam" : "order.unspam", "order", input.orderId);
  revalidateOrder(input.lang, input.orderId);
  return { ok: true };
}

/** Archived orders leave the working lists but stay in reports and history. */
export async function setOrderArchived(input: { orderId: string; archived: boolean; lang: string }): Promise<ActionResult> {
  const staff = await authorize("orders.manage");
  if (!staff) return { ok: false, error: "forbidden" };
  const supabase = createAdminClient();
  const { error } = await supabase.from("orders").update({ is_archived: input.archived }).eq("id", input.orderId);
  if (error) return { ok: false, error: "generic" };
  await addEvent(input.orderId, staff, "system", null, { archived: input.archived });
  await audit(staff, input.archived ? "order.archive" : "order.unarchive", "order", input.orderId);
  revalidateOrder(input.lang, input.orderId);
  return { ok: true };
}

/** Block the order's phone (future orders rejected) and mark this order spam. */
export async function blockOrderPhone(input: { orderId: string; reason?: string; lang: string }): Promise<ActionResult> {
  const staff = await authorize("orders.manage");
  if (!staff) return { ok: false, error: "forbidden" };
  const supabase = createAdminClient();
  const { data: order } = await supabase.from("orders").select("customer_phone").eq("id", input.orderId).maybeSingle();
  if (!order) return { ok: false, error: "not_found" };
  const { error } = await supabase
    .from("blocked_phones")
    .upsert({ phone: order.customer_phone, reason: (input.reason ?? "").slice(0, 200) || `order ${input.orderId.slice(0, 8)}` });
  if (error) return { ok: false, error: "generic" };
  await supabase.from("orders").update({ is_spam: true }).eq("id", input.orderId);
  await addEvent(input.orderId, staff, "flag", null, { blocked: true, spam: true });
  await audit(staff, "phone.block", "blocked_phone", order.customer_phone.slice(0, 4) + "******", { order: input.orderId });
  revalidateOrder(input.lang, input.orderId);
  return { ok: true };
}

export async function assignOrder(input: {
  orderId: string;
  staffId: string | null;
  lang: string;
}): Promise<ActionResult> {
  const staff = await authorize("orders.manage");
  if (!staff) return { ok: false, error: "forbidden" };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ assigned_to: input.staffId || null })
    .eq("id", input.orderId);
  if (error) return { ok: false, error: "generic" };
  await addEvent(input.orderId, staff, "assignment", null, { assigned_to: input.staffId });
  revalidateOrder(input.lang, input.orderId);
  return { ok: true };
}

/**
 * Edit non-financial order details (contact, address, notes, tags).
 * Items, prices and the delivery zone are not editable here — that would
 * need a re-quote; cancel and re-create instead.
 */
export async function updateOrderDetails(input: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerPhone2?: string;
  commune?: string;
  address: string;
  notes?: string;
  tags?: string[];
  lang: string;
}): Promise<ActionResult> {
  const staff = await authorize("orders.manage");
  if (!staff) return { ok: false, error: "forbidden" };
  const parsed = orderDetailsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const d = parsed.data;

  const supabase = createAdminClient();
  const { data: before } = await supabase
    .from("orders")
    .select("status, customer_name, customer_phone, customer_phone2, commune, address, notes, tags")
    .eq("id", d.orderId)
    .maybeSingle();
  if (!before) return { ok: false, error: "not_found" };
  if (["delivered", "returned"].includes(before.status)) return { ok: false, error: "invalid_state" };

  const patch = {
    customer_name: d.customerName,
    customer_phone: d.customerPhone,
    customer_phone2: d.customerPhone2 || null,
    commune: d.commune || null,
    address: d.address,
    notes: d.notes || null,
    tags: d.tags,
  };
  const { error } = await supabase.from("orders").update(patch).eq("id", d.orderId);
  if (error) return { ok: false, error: "generic" };

  const changed = Object.keys(patch).filter(
    (k) =>
      JSON.stringify((before as Record<string, unknown>)[k] ?? null) !==
      JSON.stringify((patch as Record<string, unknown>)[k] ?? null),
  );
  if (changed.length) {
    await addEvent(d.orderId, staff, "edit", null, { fields: changed });
    await audit(staff, "order.edit", "order", d.orderId, { fields: changed });
  }
  revalidateOrder(input.lang, d.orderId);
  return { ok: true };
}
