import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Info } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { adminOpsText } from "@/i18n/admin-ops";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { DEFAULT_LOW_STOCK, getInventoryPage, getVariantHistory } from "@/lib/data/admin-ops";
import { InventoryAdjust } from "@/components/admin/InventoryRow";
import { Card, EmptyState, NoAccess, PageHeader, Pagination, btnSecondary, buildHref, fmtDate, inputCls } from "@/components/admin/ui";
import { cn, pickLocale } from "@/lib/utils";

export default async function InventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; filter?: string; page?: string; history?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const ops = adminOpsText[lang];
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "inventory.view")) return <NoAccess t={ops.common} />;

  const sp = await searchParams;
  const filter = sp.filter === "low" || sp.filter === "out" ? sp.filter : undefined;
  const historyId = /^[0-9a-f-]{36}$/i.test(sp.history ?? "") ? sp.history! : null;
  const [result, history] = await Promise.all([
    getInventoryPage({ q: sp.q, filter, page: Number(sp.page) || 1 }),
    historyId ? getVariantHistory(historyId) : Promise.resolve(null),
  ]);
  const base = `/${lang}/admin/inventory`;
  const keep = { q: sp.q, filter };
  const canAdjust = can(staff.permissions, "inventory.adjust");

  return (
    <div className="space-y-5">
      <PageHeader
        title={ops.inventory.title}
        actions={
          <a href={buildHref("/api/admin/export/inventory", {})} download className={btnSecondary}>
            <Download className="size-4" aria-hidden />
            {ops.common.export}
          </a>
        }
      />
      <p className="flex items-start gap-2 rounded-xl border border-line bg-white px-4 py-3 text-xs text-muted">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        {ops.inventory.policy}
      </p>

      <form method="get" className="flex flex-wrap gap-2 rounded-2xl border border-line bg-white p-3">
        <input name="q" defaultValue={sp.q ?? ""} placeholder={`SKU / ${ops.inventory.variant}`} aria-label={ops.common.search} className={cn(inputCls, "max-w-xs")} />
        <select name="filter" defaultValue={filter ?? ""} aria-label={ops.common.filter} className={cn(inputCls, "w-auto")}>
          <option value="">{ops.common.all}</option>
          <option value="low">{ops.inventory.lowOnly}</option>
          <option value="out">{ops.inventory.outOnly}</option>
        </select>
        <button type="submit" className={btnSecondary}>
          {ops.common.filter}
        </button>
        <Link href={base} className="px-2 py-2 text-sm text-muted hover:text-ink">
          {ops.common.reset}
        </Link>
      </form>

      {history && (
        <Card title={ops.inventory.history} actions={<Link href={buildHref(base, keep)} className="text-xs text-muted">✕</Link>} bodyClassName="p-0">
          {history.length === 0 ? (
            <EmptyState text={ops.common.empty} />
          ) : (
            <ul className="divide-y divide-line text-sm">
              {history.map((h) => (
                <li key={String(h.id)} className="flex items-center justify-between gap-3 px-4 py-2">
                  <span>
                    <span className={cn("font-semibold", Number(h.change) < 0 ? "text-red-600" : "text-green-700")} dir="ltr">
                      {Number(h.change) > 0 ? "+" : ""}
                      {String(h.change)}
                    </span>{" "}
                    {ops.inventory.reasons[String(h.reason)] ?? String(h.reason)}
                    {Boolean(h.note) && <span className="text-muted"> · {String(h.note)}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    → {String(h.stock_after ?? "—")} · {fmtDate(String(h.created_at), true)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <div className="rounded-2xl border border-line bg-white">
        {result.rows.length === 0 ? (
          <EmptyState text={ops.common.empty} />
        ) : (
          <ul className="divide-y divide-line">
            {result.rows.map((v) => {
              const threshold = v.low_stock_threshold ?? DEFAULT_LOW_STOCK;
              return (
                <li key={v.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{pickLocale(v.product, "name", lang)}</p>
                    <p className="text-xs text-muted">
                      {[v.size, v.color].filter(Boolean).join(" / ") || "—"}
                      {v.sku && <span dir="ltr"> · {v.sku}</span>}
                      {v.product?.status === "draft" && ` · ${ops.products.status.draft}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-start gap-3">
                    <span
                      className={cn(
                        "mt-1 min-w-10 rounded-full px-2 py-0.5 text-center text-sm font-bold",
                        v.stock <= 0 ? "bg-red-100 text-red-700" : v.stock <= threshold ? "bg-amber-100 text-amber-800" : "bg-cream text-ink",
                      )}
                    >
                      {v.stock}
                    </span>
                    <InventoryAdjust
                      variantId={v.id}
                      stock={v.stock}
                      threshold={v.low_stock_threshold}
                      lang={lang}
                      ops={ops}
                      canAdjust={canAdjust}
                      historyHref={buildHref(base, { ...keep, history: v.id })}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Pagination page={result.page} pages={result.pages} total={result.total} hrefFor={(p) => buildHref(base, { ...keep, page: p })} t={ops.common} />
    </div>
  );
}
