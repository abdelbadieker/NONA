import "server-only";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type {
  Order,
  OrderItem,
  OrderStatus,
  Product,
  ProductImage,
  ProductVariant,
} from "@/lib/types";

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

export type AdminProductRow = Pick<
  Product,
  | "id"
  | "slug"
  | "name_ar"
  | "name_fr"
  | "name_en"
  | "price"
  | "total_stock"
  | "is_active"
  | "is_featured"
  | "is_best_seller"
> & { image: string | null };

export async function getAdminProducts(): Promise<AdminProductRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(
      "id, slug, name_ar, name_fr, name_en, price, total_stock, is_active, is_featured, is_best_seller, images:product_images(url, position)",
    )
    .order("created_at", { ascending: false });

  return ((data as (AdminProductRow & { images: { url: string; position: number }[] })[] | null) ?? []).map(
    (p) => {
      const image =
        [...(p.images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ??
        null;
      return { ...p, image };
    },
  );
}

export async function getProductForEdit(id: string): Promise<
  | (Product & { images: ProductImage[]; variants: ProductVariant[] })
  | null
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, images:product_images(*), variants:product_variants(*)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const p = data as Product & {
    images: ProductImage[];
    variants: ProductVariant[];
  };
  p.images = [...(p.images ?? [])].sort((a, b) => a.position - b.position);
  p.variants = [...(p.variants ?? [])].sort((a, b) => a.position - b.position);
  return p;
}

type ReasonRow = {
  id: string;
  label_ar: string;
  label_fr: string | null;
  label_en: string | null;
  position: number;
  is_active: boolean;
};

export async function getActiveReasons(kind: "cancellation" | "return") {
  const supabase = await createClient();
  const table =
    kind === "cancellation" ? "cancellation_reasons" : "return_reasons";
  const { data } = await supabase
    .from(table)
    .select("*")
    .eq("is_active", true)
    .order("position", { ascending: true });
  return (data as ReasonRow[] | null) ?? [];
}

export async function getAllReasons(
  kind: "cancellation" | "return",
): Promise<ReasonRow[]> {
  const supabase = await createClient();
  const table =
    kind === "cancellation" ? "cancellation_reasons" : "return_reasons";
  const { data } = await supabase
    .from(table)
    .select("*")
    .order("position", { ascending: true });
  return (data as ReasonRow[] | null) ?? [];
}

export const getStoreSettings = unstable_cache(
  async () => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["store", "social"]);
    const map = Object.fromEntries(
      ((data as { key: string; value: Record<string, unknown> }[] | null) ?? []).map(
        (r) => [r.key, r.value],
      ),
    );
    return {
      store: (map.store ?? {}) as Record<string, string>,
      social: (map.social ?? {}) as Record<string, string>,
    };
  },
  ["store-settings-v2"],
  { revalidate: 120, tags: ["settings"] },
);

export async function getAllDeliveryFees() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("delivery_fees")
    .select("*")
    .order("wilaya_code", { ascending: true });
  return (
    (data as {
      id: string;
      wilaya_code: number;
      name_ar: string;
      name_fr: string | null;
      home_fee: number;
      stopdesk_fee: number;
      is_active: boolean;
    }[] | null) ?? []
  );
}
