import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderStatus } from "@/lib/types";

/** What a customer may see about their own order — nothing more. */
export type TrackedOrder = {
  orderNumber: number;
  status: OrderStatus;
  createdAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  canceledAt: string | null;
  returnedAt: string | null;
  deliveryType: "home" | "stopdesk";
  wilayaName: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  items: { name: string; variantLabel: string | null; qty: number; lineTotal: number }[];
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  total: number;
};

const FIELDS =
  "id, order_number, status, created_at, confirmed_at, shipped_at, delivered_at, canceled_at, returned_at, delivery_type, wilaya_name, carrier, tracking_number, subtotal, discount_amount, delivery_fee, total, customer_phone";

type Row = Record<string, unknown> & { id: string };

async function toDto(row: Row): Promise<TrackedOrder> {
  const supabase = createAdminClient();
  const { data: items } = await supabase
    .from("order_items")
    .select("product_name, variant_label, quantity, line_total")
    .eq("order_id", row.id)
    .order("created_at", { ascending: true });
  return {
    orderNumber: Number(row.order_number),
    status: row.status as OrderStatus,
    createdAt: String(row.created_at),
    confirmedAt: (row.confirmed_at as string) ?? null,
    shippedAt: (row.shipped_at as string) ?? null,
    deliveredAt: (row.delivered_at as string) ?? null,
    canceledAt: (row.canceled_at as string) ?? null,
    returnedAt: (row.returned_at as string) ?? null,
    deliveryType: row.delivery_type as "home" | "stopdesk",
    wilayaName: (row.wilaya_name as string) ?? null,
    carrier: (row.carrier as string) ?? null,
    trackingNumber: (row.tracking_number as string) ?? null,
    items: ((items as Record<string, unknown>[] | null) ?? []).map((i) => ({
      name: String(i.product_name),
      variantLabel: (i.variant_label as string) ?? null,
      qty: Number(i.quantity),
      lineTotal: Number(i.line_total),
    })),
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discount_amount ?? 0),
    deliveryFee: Number(row.delivery_fee),
    total: Number(row.total),
  };
}

/** Lookup by order number + the phone used at checkout (both must match). */
export async function findOrderForCustomer(orderNumber: number, phone: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select(FIELDS)
    .eq("order_number", orderNumber)
    .eq("customer_phone", phone)
    .maybeSingle();
  return data ? toDto(data as Row) : null;
}

/** Lookup by the unguessable token given on the confirmation page. */
export async function findOrderByToken(token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const supabase = createAdminClient();
  const { data } = await supabase.from("orders").select(FIELDS).eq("public_token", token).maybeSingle();
  return data ? toDto(data as Row) : null;
}
