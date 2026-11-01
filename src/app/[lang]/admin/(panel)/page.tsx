import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Info } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { adminText } from "@/i18n/admin";
import { adminOpsText } from "@/i18n/admin-ops";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getDashboard } from "@/lib/data/admin-ops";
import { getMarketingPublic } from "@/lib/data/marketing";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Card, EmptyState, NoAccess, PageHeader, Stat, fmtDate, pct } from "@/components/admin/ui";
import { cn, formatPrice, pickLocale } from "@/lib/utils";

const RANGES = ["7", "30", "90"] as const;

export default async function AdminDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = adminText[lang];
  const ops = adminOpsText[lang];
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "dashboard.view")) return <NoAccess t={ops.common} />;

  const { range: rangeParam } = await searchParams;
  const range = RANGES.includes(rangeParam as (typeof RANGES)[number]) ? Number(rangeParam) : 30;
  const [d, marketing] = await Promise.all([getDashboard(range), getMarketingPublic()]);
  const m = d.metrics;
  const currency = lang === "ar" ? "دج" : "DA";
  const money = (v: number | null) => (v == null ? "—" : `${formatPrice(v)} ${currency}`);
  const base = `/${lang}/admin`;
  const showReports = can(staff.permissions, "reports.view") || can(staff.permissions, "orders.view");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.dashboard.title}
        actions={
          <div className="flex rounded-full border border-line bg-white p-0.5">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={`${base}?range=${r}`}
                aria-current={range === Number(r) ? "true" : undefined}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  range === Number(r) ? "bg-ink text-white" : "text-ink hover:bg-cream",
                )}
              >
                {ops.dashboard.range[r]}
              </Link>
            ))}
          </div>
        }
      />

      {/* Operational alerts */}
      {(d.awaiting > 0 || d.flagged > 0 || d.lowStock.count > 0) && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label={ops.dashboard.awaitingConfirmation} value={d.awaiting} href={`${base}/orders?status=not_confirmed`} tone={d.awaiting ? "warn" : undefined} />
          <Stat label={ops.dashboard.flagged} value={d.flagged} href={`${base}/orders?flagged=1`} tone={d.flagged ? "warn" : undefined} />
          <Stat label={ops.dashboard.lowStock} value={d.lowStock.count} href={`${base}/inventory?filter=low`} tone={d.lowStock.count ? "warn" : undefined} />
        </div>
      )}

      {showReports && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label={ops.dashboard.orders} value={m.orders} />
            <Stat label={ops.dashboard.grossSales} value={money(m.grossSales)} hint={m.discounts ? `−${money(m.discounts)}` : undefined} />
            <Stat label={ops.dashboard.deliveredRevenue} value={money(m.deliveredRevenue)} />
            <Stat label={ops.dashboard.aov} value={money(m.aov == null ? null : Math.round(m.aov))} />
            <Stat label={ops.dashboard.confirmationRate} value={pct(m.confirmationRate)} />
            <Stat label={ops.dashboard.deliveryRate} value={pct(m.deliveryRate)} />
            <Stat label={ops.dashboard.returnRate} value={pct(m.returnRate)} />
            <Stat label={ops.dashboard.cancelRate} value={pct(m.cancelRate)} />
            <Stat label={ops.dashboard.codInTransit} value={money(d.codInTransit)} />
            <Stat label={ops.dashboard.codToCollect} value={money(d.codToCollect)} href={`${base}/orders?payment=collected`} />
            <Stat label={ops.dashboard.newCustomers} value={d.newCustomers} />
            <Stat label={ops.dashboard.returningCustomers} value={d.returningCustomers} />
            <Stat label={ops.live.sessions} value={d.sessions} hint={`${ops.live.pageViews}: ${d.pageViews}`} />
            <Stat label={ops.live.conversion} value={pct(d.conversion)} />
            <Stat label={ops.live.leads} value={d.leads} href={`${base}/leads`} />
          </div>

          {d.bySource.length > 0 && (
            <Card title={ops.live.bySource}>
              <div className="flex flex-wrap gap-2">
                {d.bySource.map(([src, n]) => (
                  <Link key={src} href={`${base}/orders?source=${src}`} className="rounded-full border border-line px-3 py-1 text-sm hover:bg-cream">
                    {src === "unknown" ? ops.live.unknown : src}: <strong>{n}</strong>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {!marketing.ga4Id && d.pageViews === 0 && (
            <p className="flex items-center gap-2 rounded-xl border border-dashed border-line bg-white px-4 py-3 text-sm text-muted">
              <Info className="size-4 shrink-0" aria-hidden />
              {ops.dashboard.trafficNote}
            </p>
          )}

          <details className="rounded-xl border border-line bg-white px-4 py-3 text-xs text-muted">
            <summary className="cursor-pointer font-medium text-ink">{ops.dashboard.formulas}</summary>
            <ul className="mt-2 list-disc space-y-1 ps-5" dir="ltr">
              <li>Gross sales = Σ subtotal of non-canceled orders created in range (before discounts).</li>
              <li>Delivered revenue = Σ total (incl. delivery fee) of orders now delivered.</li>
              <li>AOV = (gross − discounts) ÷ non-canceled orders.</li>
              <li>Confirmation rate = orders that reached confirmation ÷ orders no longer awaiting confirmation.</li>
              <li>Delivery success = delivered ÷ (delivered + returned). Return rate = returned ÷ (delivered + returned).</li>
              <li>Held by carrier = Σ COD amounts marked collected but not yet paid out (all time).</li>
              <li>Visits = distinct first-party session ids in page views (/api/track); conversion = orders ÷ visits. Spam orders are excluded everywhere.</li>
              <li>Source: orders / order_items / customers / analytics tables. No estimates; empty = no data.</li>
            </ul>
          </details>
        </>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title={t.dashboard.recentOrders}
          actions={
            <Link href={`${base}/orders`} className="text-sm font-medium text-blush-dark hover:underline">
              {t.orders.title}
            </Link>
          }
          bodyClassName="p-0"
        >
          {d.recent.length === 0 ? (
            <EmptyState text={t.dashboard.none} />
          ) : (
            <ul className="divide-y divide-line">
              {d.recent.map((o) => (
                <li key={o.id}>
                  <Link href={`${base}/orders/${o.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-cream">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">
                        #{o.order_number} · {o.customer_name}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {o.wilaya_name} · {fmtDate(o.created_at, true)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold text-ink">{money(Number(o.total))}</span>
                      <StatusBadge status={o.status} label={t.status[o.status]} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-5">
          <Card title={ops.dashboard.topProducts} bodyClassName="p-0">
            {d.top.length === 0 ? (
              <EmptyState text={ops.dashboard.noData} />
            ) : (
              <ol className="divide-y divide-line">
                {d.top.map((p, i) => (
                  <li key={p.name + i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="truncate text-ink">
                      {i + 1}. {p.name}
                    </span>
                    <span className="shrink-0 text-muted">
                      {p.qty} {ops.dashboard.units} · {money(p.revenue)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {d.lowStock.rows.length > 0 && (
            <Card title={ops.dashboard.lowStock} bodyClassName="p-0">
              <ul className="divide-y divide-line">
                {d.lowStock.rows.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2 truncate text-ink">
                      <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-hidden />
                      {pickLocale(v.product, "name", lang)}
                      <span className="text-muted">{[v.size, v.color].filter(Boolean).join(" / ")}</span>
                    </span>
                    <span className={cn("shrink-0 font-semibold", v.stock <= 0 ? "text-red-600" : "text-amber-700")}>
                      {v.stock}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
