import "server-only";
import { createClient } from "@/lib/supabase/server";
import { computeMetrics, rangeStart, type MetricOrder } from "@/lib/metrics";
import { ORDER_STATUSES } from "@/lib/order-status";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";

// All reads use the signed-in staff member's session: RLS filters by role
// (defense in depth on top of the page-level permission checks).

export const PAGE_SIZE = 50;

/** Make free text safe for a PostgREST `or=(…)` filter. */
export function cleanSearch(q: string | undefined | null): string {
  return (q ?? "").replace(/[,()*%\\:"'.]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

function pageRange(page: number) {
  const p = Math.max(1, Math.floor(page) || 1);
  return { page: p, from: (p - 1) * PAGE_SIZE, to: p * PAGE_SIZE - 1 };
}

export type Paged<T> = { rows: T[]; total: number; page: number; pages: number };

function paged<T>(rows: T[] | null, count: number | null, page: number): Paged<T> {
  const total = count ?? 0;
  return { rows: rows ?? [], total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

// ── Orders ───────────────────────────────────────────────

export type OrderFilters = {
  status?: OrderStatus;
  payment?: string;
  flagged?: boolean;
  wilaya?: number;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
};

export type OrderListRow = Pick<
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
> & { payment_status: string; flagged: boolean; call_attempts: number; last_call_outcome: string | null };

const ORDER_LIST_FIELDS =
  "id, order_number, customer_name, customer_phone, wilaya_name, delivery_type, total, status, created_at, payment_status, flagged, call_attempts, last_call_outcome";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyOrderFilters(q: any, f: OrderFilters) {
  if (f.status && ORDER_STATUSES.includes(f.status)) q = q.eq("status", f.status);
  if (f.payment) q = q.eq("payment_status", f.payment);
  if (f.flagged) q = q.eq("flagged", true);
  if (f.wilaya) q = q.eq("wilaya_code", f.wilaya);
  if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) q = q.gte("created_at", `${f.from}T00:00:00`);
  if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) q = q.lte("created_at", `${f.to}T23:59:59.999`);
  const term = cleanSearch(f.q);
  if (term) {
    if (/^\d{1,9}$/.test(term) && !term.startsWith("0")) q = q.eq("order_number", Number(term));
    else if (/^0\d{1,9}$/.test(term)) q = q.or(`customer_phone.like.${term}%,customer_phone2.like.${term}%`);
    else q = q.ilike("customer_name", `%${term}%`);
  }
  return q;
}

export async function getOrdersPage(f: OrderFilters): Promise<Paged<OrderListRow>> {
  const supabase = await createClient();
  const { page, from, to } = pageRange(f.page ?? 1);
  let q = supabase.from("orders").select(ORDER_LIST_FIELDS, { count: "exact" });
  q = applyOrderFilters(q, f).order("created_at", { ascending: false }).range(from, to);
  const { data, count } = await q;
  return paged(data as OrderListRow[] | null, count, page);
}

/** Every matching order for CSV export (capped). */
export async function getOrdersForExport(f: OrderFilters) {
  const supabase = await createClient();
  let q = supabase
    .from("orders")
    .select(
      "order_number, created_at, status, payment_status, customer_name, customer_phone, customer_phone2, wilaya_code, wilaya_name, commune, address, delivery_type, subtotal, discount_code, discount_amount, delivery_fee, total, carrier, tracking_number, notes, items:order_items(product_name, variant_label, sku, quantity)",
    );
  q = applyOrderFilters(q, f).order("created_at", { ascending: false }).limit(5000);
  const { data } = await q;
  return (data as Record<string, unknown>[] | null) ?? [];
}

export async function getOrderCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const results = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }),
    ...ORDER_STATUSES.map((s) => supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", s)),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("flagged", true),
  ]);
  const counts: Record<string, number> = { all: results[0].count ?? 0 };
  ORDER_STATUSES.forEach((s, i) => (counts[s] = results[i + 1].count ?? 0));
  counts.flagged = results[ORDER_STATUSES.length + 1].count ?? 0;
  return counts;
}

export type OrderEvent = {
  id: number;
  type: string;
  message: string | null;
  data: Record<string, unknown>;
  actor_id: string | null;
  created_at: string;
};

export type StaffOption = { id: string; label: string };

export async function getOrderDetail(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) return null;
  const [items, events, staff] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", id).order("created_at", { ascending: true }),
    supabase.from("order_events").select("*").eq("order_id", id).order("created_at", { ascending: false }).limit(200),
    supabase.from("admins").select("id, email, full_name, is_active"),
  ]);
  const staffRows = (staff.data as { id: string; email: string | null; full_name: string | null; is_active: boolean }[] | null) ?? [];
  return {
    order: order as Order & Record<string, unknown>,
    items: (items.data as (OrderItem & { sku: string | null; image_url: string | null })[] | null) ?? [],
    events: (events.data as OrderEvent[] | null) ?? [],
    staff: staffRows.map((s) => ({ id: s.id, label: s.full_name || s.email || s.id.slice(0, 8), active: s.is_active })),
  };
}

// ── Products & inventory ─────────────────────────────────

export type ProductListRow = {
  id: string;
  slug: string;
  name_ar: string;
  name_fr: string | null;
  name_en: string | null;
  price: number;
  total_stock: number;
  status: "active" | "draft" | "archived";
  is_featured: boolean;
  category_id: string | null;
  updated_at: string;
  image: string | null;
};

export async function getProductsPage(f: { q?: string; status?: string; category?: string; page?: number }) {
  const supabase = await createClient();
  const { page, from, to } = pageRange(f.page ?? 1);
  let q = supabase
    .from("products")
    .select(
      "id, slug, name_ar, name_fr, name_en, price, total_stock, status, is_featured, category_id, updated_at, images:product_images(url, position)",
      { count: "exact" },
    );
  if (f.status && ["active", "draft", "archived"].includes(f.status)) q = q.eq("status", f.status);
  else q = q.neq("status", "archived");
  if (f.category && /^[0-9a-f-]{36}$/i.test(f.category)) q = q.eq("category_id", f.category);
  const term = cleanSearch(f.q);
  if (term) q = q.or(`name_ar.ilike.%${term}%,name_fr.ilike.%${term}%,name_en.ilike.%${term}%,slug.ilike.%${term}%`);
  const { data, count } = await q.order("updated_at", { ascending: false }).range(from, to);
  const rows = ((data as (ProductListRow & { images: { url: string; position: number }[] })[] | null) ?? []).map(
    ({ images, ...p }) => ({
      ...p,
      image: [...(images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null,
    }),
  );
  return paged(rows, count, page);
}

export type InventoryRow = {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  sku: string | null;
  stock: number;
  low_stock_threshold: number | null;
  is_active: boolean;
  product: { name_ar: string; name_fr: string | null; name_en: string | null; slug: string; status: string } | null;
};

export const DEFAULT_LOW_STOCK = 5;

export async function getInventoryPage(f: { q?: string; filter?: string; page?: number }) {
  const supabase = await createClient();
  const { page, from, to } = pageRange(f.page ?? 1);
  let q = supabase
    .from("product_variants")
    .select(
      "id, product_id, size, color, sku, stock, low_stock_threshold, is_active, product:products!inner(name_ar, name_fr, name_en, slug, status)",
      { count: "exact" },
    )
    .eq("is_active", true)
    .neq("product.status", "archived");
  if (f.filter === "out") q = q.lte("stock", 0);
  // "low" uses the default threshold in the query; per-variant thresholds are
  // applied on the result (PostgREST can't compare two columns).
  if (f.filter === "low") q = q.lte("stock", 50);
  const term = cleanSearch(f.q);
  if (term) q = q.or(`sku.ilike.%${term}%,size.ilike.%${term}%,color.ilike.%${term}%`);
  const { data, count } = await q.order("stock", { ascending: true }).range(from, to);
  let rows = (data as InventoryRow[] | null) ?? [];
  if (f.filter === "low") {
    rows = rows.filter((r) => r.stock <= (r.low_stock_threshold ?? DEFAULT_LOW_STOCK));
    return { rows, total: rows.length, page: 1, pages: 1 };
  }
  return paged(rows, count, page);
}

export async function getLowStock(limit = 8) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_variants")
    .select("id, size, color, stock, low_stock_threshold, product:products!inner(id, name_ar, name_fr, name_en, status)")
    .eq("is_active", true)
    .eq("product.status", "active")
    .lte("stock", 50)
    .order("stock", { ascending: true })
    .limit(200);
  const rows = ((data as (InventoryRow & { product: { id: string } })[] | null) ?? []).filter(
    (r) => r.stock <= (r.low_stock_threshold ?? DEFAULT_LOW_STOCK),
  );
  return { count: rows.length, rows: rows.slice(0, limit) };
}

export async function getVariantHistory(variantId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory_logs")
    .select("id, change, reason, stock_after, note, order_id, created_by, created_at")
    .eq("variant_id", variantId)
    .order("created_at", { ascending: false })
    .limit(30);
  return (data as Record<string, unknown>[] | null) ?? [];
}

// ── Customers ────────────────────────────────────────────

export type CustomerRow = {
  id: string;
  phone: string;
  full_name: string | null;
  wilaya_code: number | null;
  orders_count: number;
  delivered_count: number;
  canceled_count: number;
  returned_count: number;
  total_spent: number;
  last_order_at: string | null;
  accepts_marketing: boolean;
  tags: string[];
};

const CUSTOMER_FIELDS =
  "id, phone, full_name, wilaya_code, orders_count, delivered_count, canceled_count, returned_count, total_spent, last_order_at, first_order_at, accepts_marketing, tags";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyCustomerFilters(q: any, f: { q?: string; segment?: string; tag?: string }) {
  switch (f.segment) {
    case "first_time":
      q = q.eq("orders_count", 1);
      break;
    case "returning":
      q = q.gte("delivered_count", 2);
      break;
    case "marketing":
      q = q.eq("accepts_marketing", true);
      break;
    case "inactive":
      q = q.lt("last_order_at", new Date(Date.now() - 90 * 864e5).toISOString());
      break;
    case "risky":
      q = q.or("canceled_count.gte.2,returned_count.gte.2");
      break;
  }
  if (f.tag) q = q.contains("tags", [f.tag.slice(0, 30)]);
  const term = cleanSearch(f.q);
  if (term) {
    q = /^0?\d+$/.test(term) ? q.like("phone", `${term}%`) : q.ilike("full_name", `%${term}%`);
  }
  return q;
}

export async function getCustomersPage(f: { q?: string; segment?: string; tag?: string; page?: number }) {
  const supabase = await createClient();
  const { page, from, to } = pageRange(f.page ?? 1);
  let q = supabase.from("customers").select(CUSTOMER_FIELDS, { count: "exact" });
  q = applyCustomerFilters(q, f).order("last_order_at", { ascending: false, nullsFirst: false }).range(from, to);
  const { data, count } = await q;
  return paged(data as CustomerRow[] | null, count, page);
}

export async function getCustomersForExport(f: { q?: string; segment?: string; tag?: string }) {
  const supabase = await createClient();
  let q = supabase.from("customers").select(`${CUSTOMER_FIELDS}, email, commune, created_at`);
  q = applyCustomerFilters(q, f).order("last_order_at", { ascending: false }).limit(10000);
  const { data } = await q;
  return (data as Record<string, unknown>[] | null) ?? [];
}

export async function getCustomerDetail(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (!customer) return null;
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_status, total, created_at")
    .eq("customer_id", id)
    .order("created_at", { ascending: false })
    .limit(100);
  return {
    customer: customer as CustomerRow & Record<string, unknown>,
    orders: (orders as Pick<Order, "id" | "order_number" | "status" | "total" | "created_at">[] | null) ?? [],
  };
}

// ── Discounts, content, forms, staff, audit ──────────────

export async function getDiscounts() {
  const supabase = await createClient();
  const { data } = await supabase.from("discounts").select("*").order("created_at", { ascending: false });
  return (data as Record<string, unknown>[] | null) ?? [];
}

export async function getDiscount(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("discounts").select("*").eq("id", id).maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}

export async function getProductOptions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name_ar, name_fr, name_en")
    .neq("status", "archived")
    .order("name_ar")
    .limit(500);
  return (data as { id: string; name_ar: string; name_fr: string | null; name_en: string | null }[] | null) ?? [];
}

export async function getAllCategories() {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("id, slug, name_ar, name_fr, name_en").order("position");
  return (data as { id: string; slug: string; name_ar: string; name_fr: string | null; name_en: string | null }[] | null) ?? [];
}

export async function getPagesList() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("id, slug, title_ar, title_fr, title_en, is_published, show_in_footer, position, updated_at")
    .order("position");
  return (data as Record<string, unknown>[] | null) ?? [];
}

export async function getPageForEdit(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("pages").select("*").eq("id", id).maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}

export async function getSubmissions(f: { status?: string; page?: number }) {
  const supabase = await createClient();
  const { page, from, to } = pageRange(f.page ?? 1);
  let q = supabase.from("form_submissions").select("*", { count: "exact" });
  if (f.status && ["new", "read", "archived"].includes(f.status)) q = q.eq("status", f.status);
  else q = q.neq("status", "archived");
  const { data, count } = await q.order("created_at", { ascending: false }).range(from, to);
  const subs = await supabase
    .from("subscribers")
    .select("id", { count: "exact", head: true })
    .eq("status", "subscribed");
  return { ...paged(data as Record<string, unknown>[] | null, count, page), subscribers: subs.count ?? 0 };
}

export async function getStaffAndRoles() {
  const supabase = await createClient();
  const [admins, roles] = await Promise.all([
    supabase.from("admins").select("id, email, full_name, role_key, is_active, created_at").order("created_at"),
    supabase.from("staff_roles").select("*").order("is_system", { ascending: false }).order("key"),
  ]);
  return {
    staff: (admins.data as { id: string; email: string | null; full_name: string | null; role_key: string; is_active: boolean }[] | null) ?? [],
    roles:
      (roles.data as { key: string; name_ar: string; name_fr: string | null; name_en: string | null; permissions: string[]; is_system: boolean }[] | null) ??
      [],
  };
}

export async function getAuditPage(f: { q?: string; status?: string; page?: number }) {
  const supabase = await createClient();
  const { page, from, to } = pageRange(f.page ?? 1);
  let q = supabase.from("audit_logs").select("*", { count: "exact" });
  if (f.status === "failure") q = q.eq("status", "failure");
  const term = cleanSearch(f.q);
  if (term) q = q.or(`action.ilike.%${term}%,actor_email.ilike.%${term}%,resource_type.ilike.%${term}%`);
  const { data, count } = await q.order("created_at", { ascending: false }).range(from, to);
  return paged(data as Record<string, unknown>[] | null, count, page);
}

// ── Dashboard ────────────────────────────────────────────

export async function getDashboard(days: number) {
  const supabase = await createClient();
  const start = rangeStart(days).toISOString();

  const [ordersRes, pendingRes, flaggedRes, transitRes, collectedRes, newCust, lowStock, recentRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, status, subtotal, discount_amount, total, created_at, customer_id")
      .gte("created_at", start)
      .limit(20000),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "not_confirmed"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("flagged", true).in("status", ["not_confirmed", "confirmed"]),
    supabase.from("orders").select("total").eq("status", "in_delivery").limit(20000),
    supabase.from("orders").select("cod_collected_amount").eq("payment_status", "collected").limit(20000),
    supabase.from("customers").select("id", { count: "exact", head: true }).gte("first_order_at", start),
    getLowStock(6),
    supabase
      .from("orders")
      .select("id, order_number, customer_name, wilaya_name, total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const orders = (ordersRes.data as (MetricOrder & { id: string; customer_id: string | null })[] | null) ?? [];
  const metrics = computeMetrics(orders);

  // Returning = distinct customers in range whose first order predates the range.
  const customerIds = [...new Set(orders.map((o) => o.customer_id).filter(Boolean))] as string[];
  let returning = 0;
  if (customerIds.length) {
    const { count } = await supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .in("id", customerIds.slice(0, 1000))
      .lt("first_order_at", start);
    returning = count ?? 0;
  }

  // Top products by delivered units in range.
  const deliveredIds = orders.filter((o) => o.status === "delivered").map((o) => o.id);
  let top: { name: string; qty: number; revenue: number }[] = [];
  if (deliveredIds.length) {
    const { data: items } = await supabase
      .from("order_items")
      .select("product_id, product_name, quantity, line_total")
      .in("order_id", deliveredIds.slice(0, 1000));
    const agg = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const it of (items as { product_id: string | null; product_name: string; quantity: number; line_total: number }[] | null) ?? []) {
      const k = it.product_id ?? it.product_name;
      const cur = agg.get(k) ?? { name: it.product_name, qty: 0, revenue: 0 };
      cur.qty += Number(it.quantity);
      cur.revenue += Number(it.line_total);
      agg.set(k, cur);
    }
    top = [...agg.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }

  const sum = (rows: Record<string, unknown>[] | null, k: string) =>
    (rows ?? []).reduce((s, r) => s + (Number(r[k]) || 0), 0);

  return {
    metrics,
    awaiting: pendingRes.count ?? 0,
    flagged: flaggedRes.count ?? 0,
    codInTransit: sum(transitRes.data as Record<string, unknown>[] | null, "total"),
    codToCollect: sum(collectedRes.data as Record<string, unknown>[] | null, "cod_collected_amount"),
    newCustomers: newCust.count ?? 0,
    returningCustomers: returning,
    lowStock,
    top,
    recent: (recentRes.data as Pick<Order, "id" | "order_number" | "customer_name" | "wilaya_name" | "total" | "status" | "created_at">[] | null) ?? [],
  };
}

// ── Integrations / health ────────────────────────────────

const MIGRATION_PROBES: [string, string][] = [
  ["0001_init", "products"],
  ["0003_security_hardening", "staff_roles"],
  ["0004_commerce_core", "customers"],
  ["0005_content_forms", "pages"],
];

export async function getHealth() {
  const supabase = await createClient();
  const migrations = await Promise.all(
    MIGRATION_PROBES.map(async ([name, table]) => {
      const { error } = await supabase.from(table).select("*", { head: true, count: "exact" }).limit(1);
      return { name, ok: !error || error.code !== "42P01" };
    }),
  );
  const { data: failures } = await supabase
    .from("audit_logs")
    .select("id, action, resource_type, resource_id, actor_email, metadata, created_at")
    .eq("status", "failure")
    .order("created_at", { ascending: false })
    .limit(10);
  return { migrations, failures: (failures as Record<string, unknown>[] | null) ?? [] };
}
