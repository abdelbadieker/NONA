import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Flag, PhoneCall } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { adminText } from "@/i18n/admin";
import { adminOpsText } from "@/i18n/admin-ops";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getOrderCounts, getOrdersPage, type OrderFilters } from "@/lib/data/admin-ops";
import { getAllDeliveryFees } from "@/lib/data/admin";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/order-status";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Badge, EmptyState, NoAccess, PageHeader, Pagination, btnSecondary, buildHref, fmtDate, inputCls } from "@/components/admin/ui";
import { cn, formatPrice } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

type SP = { status?: string; payment?: string; flagged?: string; wilaya?: string; q?: string; from?: string; to?: string; page?: string };

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SP>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = adminText[lang];
  const ops = adminOpsText[lang];
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "orders.view")) return <NoAccess t={ops.common} />;

  const sp = await searchParams;
  const status = ORDER_STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined;
  const filters: OrderFilters = {
    status,
    payment: PAYMENT_STATUSES.includes(sp.payment as never) ? sp.payment : undefined,
    flagged: sp.flagged === "1",
    wilaya: Number(sp.wilaya) || undefined,
    q: sp.q,
    from: sp.from,
    to: sp.to,
    page: Number(sp.page) || 1,
  };

  const [result, counts, wilayas] = await Promise.all([getOrdersPage(filters), getOrderCounts(), getAllDeliveryFees()]);
  const currency = lang === "ar" ? "دج" : "DA";
  const base = `/${lang}/admin/orders`;
  const keep = {
    status: filters.status,
    payment: filters.payment,
    flagged: filters.flagged ? "1" : undefined,
    wilaya: filters.wilaya,
    q: filters.q,
    from: filters.from,
    to: filters.to,
  };

  const tabs = [
    { key: "all", label: t.orders.all, href: buildHref(base, { ...keep, status: undefined, flagged: undefined }), active: !status && !filters.flagged },
    ...ORDER_STATUSES.map((s) => ({
      key: s,
      label: t.status[s],
      href: buildHref(base, { ...keep, status: s, flagged: undefined }),
      active: status === s,
    })),
    { key: "flagged", label: ops.orders.flaggedOnly, href: buildHref(base, { ...keep, status: undefined, flagged: "1" }), active: !!filters.flagged && !status },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.orders.title}
        actions={
          can(staff.permissions, "orders.export") && (
            <a href={buildHref(`/api/admin/export/orders`, keep)} className={btnSecondary}>
              <Download className="size-4" aria-hidden />
              {ops.common.export}
            </a>
          )
        }
      />

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              tab.active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:bg-cream",
            )}
          >
            {tab.label}
            <span className={cn("rounded-full px-1.5 text-xs", tab.active ? "bg-white/20" : "bg-cream text-muted")}>
              {counts[tab.key] ?? 0}
            </span>
          </Link>
        ))}
      </div>

      <form method="get" className="grid gap-2 rounded-2xl border border-line bg-white p-3 sm:grid-cols-2 lg:grid-cols-6">
        {status && <input type="hidden" name="status" value={status} />}
        {filters.flagged && <input type="hidden" name="flagged" value="1" />}
        <input name="q" defaultValue={sp.q ?? ""} placeholder={ops.orders.searchPlaceholder} aria-label={ops.common.search} className={cn(inputCls, "lg:col-span-2")} />
        <select name="payment" defaultValue={filters.payment ?? ""} aria-label={ops.orders.payment} className={inputCls}>
          <option value="">{ops.orders.payment}: {ops.common.all}</option>
          {PAYMENT_STATUSES.map((p) => (
            <option key={p} value={p}>
              {ops.orders.paymentStatus[p]}
            </option>
          ))}
        </select>
        <select name="wilaya" defaultValue={filters.wilaya ?? ""} aria-label={ops.orders.wilayaFilter} className={inputCls}>
          <option value="">{ops.orders.wilayaFilter}: {ops.common.all}</option>
          {wilayas.map((w) => (
            <option key={w.wilaya_code} value={w.wilaya_code}>
              {w.wilaya_code} · {lang === "ar" ? w.name_ar : (w.name_fr ?? w.name_ar)}
            </option>
          ))}
        </select>
        <div className="flex gap-2 lg:col-span-2">
          <input type="date" name="from" defaultValue={sp.from ?? ""} aria-label={ops.common.from} className={inputCls} />
          <input type="date" name="to" defaultValue={sp.to ?? ""} aria-label={ops.common.to} className={inputCls} />
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
          <button type="submit" className={btnSecondary}>
            {ops.common.filter}
          </button>
          <Link href={base} className="px-2 py-2 text-sm text-muted hover:text-ink">
            {ops.common.reset}
          </Link>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {result.rows.length === 0 ? (
          <EmptyState text={t.orders.empty} />
        ) : (
          <ul className="divide-y divide-line">
            {result.rows.map((o) => (
              <li key={o.id}>
                <Link href={`${base}/${o.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-cream">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                      {o.flagged && <Flag className="size-3.5 text-amber-600" aria-label={ops.orders.flag} />}#
                      {o.order_number} · {o.customer_name}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                      <span>{o.wilaya_name}</span>
                      <span>{fmtDate(o.created_at, true)}</span>
                      <span dir="ltr">{o.customer_phone}</span>
                      {o.call_attempts > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <PhoneCall className="size-3" aria-hidden />
                          {o.call_attempts}
                          {o.last_call_outcome && ` · ${ops.orders.callOutcomes[o.last_call_outcome] ?? o.last_call_outcome}`}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-bold text-ink">
                      {formatPrice(Number(o.total))} {currency}
                    </span>
                    <div className="flex gap-1">
                      {o.payment_status !== "pending" && o.payment_status !== "voided" && (
                        <Badge tone={o.payment_status === "refunded" ? "red" : "green"}>
                          {ops.orders.paymentStatus[o.payment_status]}
                        </Badge>
                      )}
                      <StatusBadge status={o.status} label={t.status[o.status]} />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Pagination
        page={result.page}
        pages={result.pages}
        total={result.total}
        hrefFor={(p) => buildHref(base, { ...keep, page: p })}
        t={ops.common}
      />
    </div>
  );
}
