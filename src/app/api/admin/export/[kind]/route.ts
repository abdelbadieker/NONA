import type { NextRequest } from "next/server";
import { getStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { can, type Permission } from "@/lib/permissions";
import { toCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";
import { getCustomersForExport, getOrdersForExport } from "@/lib/data/admin-ops";
import { ORDER_STATUSES } from "@/lib/order-status";
import type { OrderStatus } from "@/lib/types";

const PERMS: Record<string, Permission> = {
  orders: "orders.export",
  customers: "customers.export",
  products: "products.view",
  inventory: "inventory.view",
};

type Row = Record<string, unknown>;

/**
 * Staff CSV exports. Permission-checked per kind, RLS-scoped reads,
 * formula-injection-safe cells, audit-logged. Never cached.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const perm = PERMS[kind];
  if (!perm) return new Response("Not found", { status: 404 });
  const staff = await getStaff();
  if (!staff) return new Response("Unauthorized", { status: 401 });
  if (!can(staff.permissions, perm)) return new Response("Forbidden", { status: 403 });

  const sp = req.nextUrl.searchParams;
  let csv = "";
  let count = 0;

  if (kind === "orders") {
    const status = sp.get("status");
    const rows = await getOrdersForExport({
      status: ORDER_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : undefined,
      payment: sp.get("payment") ?? undefined,
      flagged: sp.get("flagged") === "1",
      wilaya: Number(sp.get("wilaya")) || undefined,
      q: sp.get("q") ?? undefined,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
    });
    count = rows.length;
    const items = (r: Row) =>
      ((r.items as Row[]) ?? [])
        .map((i) => `${i.quantity}× ${i.product_name}${i.variant_label ? ` (${i.variant_label})` : ""}${i.sku ? ` [${i.sku}]` : ""}`)
        .join(" | ");
    csv = toCsv(rows, [
      { header: "order_number", value: (r) => r.order_number },
      { header: "created_at", value: (r) => r.created_at },
      { header: "status", value: (r) => r.status },
      { header: "payment_status", value: (r) => r.payment_status },
      { header: "customer_name", value: (r) => r.customer_name },
      { header: "phone", value: (r) => r.customer_phone },
      { header: "phone2", value: (r) => r.customer_phone2 },
      { header: "wilaya_code", value: (r) => r.wilaya_code },
      { header: "wilaya", value: (r) => r.wilaya_name },
      { header: "commune", value: (r) => r.commune },
      { header: "address", value: (r) => r.address },
      { header: "delivery_type", value: (r) => r.delivery_type },
      { header: "items", value: items },
      { header: "subtotal", value: (r) => r.subtotal },
      { header: "discount_code", value: (r) => r.discount_code },
      { header: "discount", value: (r) => r.discount_amount },
      { header: "delivery_fee", value: (r) => r.delivery_fee },
      { header: "total_cod", value: (r) => r.total },
      { header: "carrier", value: (r) => r.carrier },
      { header: "tracking_number", value: (r) => r.tracking_number },
      { header: "notes", value: (r) => r.notes },
    ]);
  } else if (kind === "customers") {
    const rows = await getCustomersForExport({
      q: sp.get("q") ?? undefined,
      segment: sp.get("segment") ?? undefined,
      tag: sp.get("tag") ?? undefined,
    });
    count = rows.length;
    csv = toCsv(rows, [
      { header: "name", value: (r) => r.full_name },
      { header: "phone", value: (r) => r.phone },
      { header: "email", value: (r) => r.email },
      { header: "wilaya_code", value: (r) => r.wilaya_code },
      { header: "orders", value: (r) => r.orders_count },
      { header: "delivered", value: (r) => r.delivered_count },
      { header: "canceled", value: (r) => r.canceled_count },
      { header: "returned", value: (r) => r.returned_count },
      { header: "total_spent", value: (r) => r.total_spent },
      { header: "first_order_at", value: (r) => r.first_order_at },
      { header: "last_order_at", value: (r) => r.last_order_at },
      { header: "accepts_marketing", value: (r) => (r.accepts_marketing ? "yes" : "no") },
      { header: "tags", value: (r) => ((r.tags as string[]) ?? []).join("; ") },
    ]);
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("product_variants")
      .select(
        "id, size, color, sku, barcode, stock, price_override, cost_price, is_active, product:products!inner(slug, name_ar, name_fr, price, cost_price, status, vendor, product_type, tags)",
      )
      .limit(10000);
    const rows = (data as Row[] | null) ?? [];
    count = rows.length;
    const p = (r: Row) => (r.product ?? {}) as Row;
    csv = toCsv(rows, [
      { header: "product_slug", value: (r) => p(r).slug },
      { header: "product_name_ar", value: (r) => p(r).name_ar },
      { header: "product_name_fr", value: (r) => p(r).name_fr },
      { header: "status", value: (r) => p(r).status },
      { header: "vendor", value: (r) => p(r).vendor },
      { header: "type", value: (r) => p(r).product_type },
      { header: "tags", value: (r) => ((p(r).tags as string[]) ?? []).join("; ") },
      { header: "variant_id", value: (r) => r.id },
      { header: "size", value: (r) => r.size },
      { header: "color", value: (r) => r.color },
      { header: "sku", value: (r) => r.sku },
      { header: "barcode", value: (r) => r.barcode },
      { header: "price", value: (r) => r.price_override ?? p(r).price },
      { header: "cost", value: (r) => r.cost_price ?? p(r).cost_price },
      { header: "stock", value: (r) => r.stock },
      { header: "variant_active", value: (r) => (r.is_active ? "yes" : "no") },
    ]);
  }

  await audit(staff, `export.${kind}`, kind, null, { rows: count, filters: Object.fromEntries(sp.entries()) });
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nona-${kind}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
