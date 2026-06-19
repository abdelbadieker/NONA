import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Order, OrderStatus } from "@/lib/types";

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
