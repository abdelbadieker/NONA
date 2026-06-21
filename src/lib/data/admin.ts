import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";

export type DashboardStats = {
  totalOrders: number;
  pending: number;
  delivered: number;
  products: number;
  revenue: number;
  recent: Pick<
    Order,
    "id" | "order_number" | "customer_name" | "wilaya_name" | "total" | "status" | "created_at"
  >[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const [total, pending, delivered, products, deliveredRows, recent] =
    await Promise.all([
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "not_confirmed"),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "delivered"),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("total").eq("status", "delivered"),
      supabase
        .from("orders")
        .select(
          "id, order_number, customer_name, wilaya_name, total, status, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const revenue = ((deliveredRows.data as { total: number }[] | null) ?? []).reduce(
    (sum, o) => sum + Number(o.total),
    0,
  );

  return {
    totalOrders: total.count ?? 0,
    pending: pending.count ?? 0,
    delivered: delivered.count ?? 0,
    products: products.count ?? 0,
    revenue,
    recent: (recent.data as DashboardStats["recent"] | null) ?? [],
  };
}

export const ORDER_STATUSES: OrderStatus[] = [
  "not_confirmed",
  "confirmed",
  "in_delivery",
  "delivered",
  "returned",
  "canceled",
];

export type OrderRow = Pick<
  Order,
  | "id"
  | "order_number"
  | "customer_name"
  | "customer_phone"
  | "wilaya_name"
  | "delivery_type"
  | "total"
  | "status"
  | "created_at"
>;

export async function getOrders(status?: OrderStatus): Promise<OrderRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_phone, wilaya_name, delivery_type, total, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return (data as OrderRow[] | null) ?? [];
}

export async function getOrderCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const results = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }),
    ...ORDER_STATUSES.map((s) =>
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", s),
    ),
  ]);
  const counts: Record<string, number> = { all: results[0].count ?? 0 };
  ORDER_STATUSES.forEach((s, i) => {
    counts[s] = results[i + 1].count ?? 0;
  });
  return counts;
}

export async function getOrderById(
  id: string,
): Promise<{ order: Order; items: OrderItem[] } | null> {
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!order) return null;
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id)
    .order("created_at", { ascending: true });
  return { order: order as Order, items: (items as OrderItem[] | null) ?? [] };
}

export async function getActiveReasons(kind: "cancellation" | "return") {
  const supabase = await createClient();
  const table =
    kind === "cancellation" ? "cancellation_reasons" : "return_reasons";
  const { data } = await supabase
    .from(table)
    .select("*")
    .eq("is_active", true)
    .order("position", { ascending: true });
  return (data as { id: string; label_ar: string; label_fr: string | null; label_en: string | null }[] | null) ?? [];
}
