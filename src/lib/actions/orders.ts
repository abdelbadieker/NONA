"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/auth";
import { getMarketingServer } from "@/lib/data/marketing";
import { sendMetaPurchase } from "@/lib/meta-capi";
import { orderInputSchema, type OrderInput } from "@/lib/validation";
import type { OrderStatus } from "@/lib/types";

type Result =
  | {
      ok: true;
      orderNumber: number;
      eventId: string;
      productId: string;
      value: number;
    }
  | { ok: false; error: "validation" | "stock" | "generic" | "rate" };

/**
 * Creates a guest order (status: not_confirmed). Stock is NOT decremented here
 * — that happens when an admin confirms the order. Price, stock and delivery
 * fee are all re-derived on the server; client values are never trusted.
 */
export async function createOrder(input: OrderInput): Promise<Result> {
  const parsed = orderInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const d = parsed.data;

  const supabase = createAdminClient();

  // Anti double-submit / spam: one order per phone per 10s.
  const { count: recent } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("customer_phone", d.customerPhone)
    .gte("created_at", new Date(Date.now() - 10_000).toISOString());
  if ((recent ?? 0) > 0) return { ok: false, error: "rate" };

  const { data: product } = await supabase
    .from("products")
    .select("id, slug, price, name_ar, name_fr, name_en, is_active")
    .eq("slug", d.productSlug)
    .maybeSingle();
  if (!product || !product.is_active) return { ok: false, error: "generic" };

  const { data: variant } = await supabase
    .from("product_variants")
    .select("id, product_id, size, color, price_override, stock, is_active")
    .eq("id", d.variantId)
    .maybeSingle();
  if (!variant || variant.product_id !== product.id || !variant.is_active) {
    return { ok: false, error: "generic" };
  }
  if (Number(variant.stock) < d.qty) return { ok: false, error: "stock" };

  const { data: fee } = await supabase
    .from("delivery_fees")
    .select("wilaya_code, name_ar, home_fee, stopdesk_fee, is_active")
    .eq("wilaya_code", d.wilayaCode)
    .maybeSingle();
  if (!fee || !fee.is_active) return { ok: false, error: "generic" };

  const unitPrice = Number(variant.price_override ?? product.price);
  const lineTotal = unitPrice * d.qty;
  const deliveryFee = Number(
    d.deliveryType === "home" ? fee.home_fee : fee.stopdesk_fee,
  );
  const subtotal = lineTotal;
  const total = subtotal + deliveryFee;

  const productName: string =
    product[`name_${d.locale}` as "name_ar"] || product.name_ar;
  const variantLabel =
    [variant.size, variant.color].filter(Boolean).join(" / ") || null;

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      status: "not_confirmed",
      customer_name: d.customerName,
      customer_phone: d.customerPhone,
      customer_phone2: d.customerPhone2 || null,
      wilaya_code: d.wilayaCode,
      wilaya_name: fee.name_ar,
      commune: d.commune || null,
      address: d.address,
      delivery_type: d.deliveryType,
      delivery_fee: deliveryFee,
      subtotal,
      total,
      notes: d.notes || null,
      locale: d.locale,
    })
    .select("id, order_number")
    .single();
  if (orderErr || !order) return { ok: false, error: "generic" };

  const { error: itemErr } = await supabase.from("order_items").insert({
    order_id: order.id,
    product_id: product.id,
    variant_id: variant.id,
    product_name: productName,
    variant_label: variantLabel,
    size: variant.size,
    color: variant.color,
    unit_price: unitPrice,
    quantity: d.qty,
    line_total: lineTotal,
  });
  if (itemErr) {
    await supabase.from("orders").delete().eq("id", order.id);
    return { ok: false, error: "generic" };
  }

  // Best-effort funnel event.
  await supabase.from("analytics").insert({
    event_type: "order_placed",
    locale: d.locale,
    product_id: product.id,
    order_id: order.id,
    metadata: { total, wilaya: d.wilayaCode, delivery_type: d.deliveryType },
  });

  // Meta Conversions API — server Purchase, deduped with the browser pixel.
  const eventId = globalThis.crypto?.randomUUID?.() ?? order.id;
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
        contentIds: [product.id],
        numItems: d.qty,
        phone: d.customerPhone,
        clientIp:
          (hdrs.get("x-forwarded-for")?.split(",")[0] ??
            hdrs.get("x-real-ip") ??
            "").trim() || undefined,
        userAgent: hdrs.get("user-agent") ?? undefined,
        fbp: cookieStore.get("_fbp")?.value,
        fbc: cookieStore.get("_fbc")?.value,
        eventSourceUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${d.locale}/checkout`,
      });
    }
  } catch {
    // never block checkout on tracking
  }

  return {
    ok: true,
    orderNumber: Number(order.order_number),
    eventId,
    productId: product.id,
    value: total,
  };
}

const TS_COL: Partial<Record<OrderStatus, string>> = {
  confirmed: "confirmed_at",
  delivered: "delivered_at",
  canceled: "canceled_at",
  returned: "returned_at",
};

/**
 * Admin-only order status change. The DB trigger adjusts stock automatically
 * (confirm decrements, cancel/return restock) and blocks overselling.
 */
export async function updateOrderStatus(input: {
  orderId: string;
  status: OrderStatus;
  reasonId?: string | null;
  lang: string;
}): Promise<{ ok: true } | { ok: false; error: "auth" | "stock" | "generic" }> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "auth" };

  const supabase = await createClient();
  const patch: Record<string, unknown> = { status: input.status };
  const tsCol = TS_COL[input.status];
  if (tsCol) patch[tsCol] = new Date().toISOString();
  if (input.status === "canceled") {
    patch.cancellation_reason_id = input.reasonId ?? null;
  }
  if (input.status === "returned") {
    patch.return_reason_id = input.reasonId ?? null;
  }

  const { error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", input.orderId);

  if (error) {
    return {
      ok: false,
      error: /insufficient stock/i.test(error.message) ? "stock" : "generic",
    };
  }

  revalidatePath(`/${input.lang}/admin/orders/${input.orderId}`);
  revalidatePath(`/${input.lang}/admin/orders`);
  revalidatePath(`/${input.lang}/admin`);
  return { ok: true };
}
