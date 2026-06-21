import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { adminText } from "@/i18n/admin";
import {
  getOrders,
  getOrderCounts,
  ORDER_STATUSES,
} from "@/lib/data/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { cn, formatPrice } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("fr-DZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const { status } = await searchParams;
  const t = adminText[lang];
  const currency = lang === "ar" ? "دج" : "DA";
  const active = ORDER_STATUSES.includes(status as OrderStatus)
    ? (status as OrderStatus)
    : undefined;

  const [orders, counts] = await Promise.all([
    getOrders(active),
    getOrderCounts(),
  ]);

  const base = `/${lang}/admin/orders`;
  const tabs = [
    { key: "all" as const, label: t.orders.all, href: base, isActive: !active },
    ...ORDER_STATUSES.map((s) => ({
      key: s,
      label: t.status[s],
      href: `${base}?status=${s}`,
      isActive: active === s,
    })),
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink">{t.orders.title}</h1>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              tab.isActive
                ? "border-ink bg-ink text-white"
                : "border-line bg-white text-ink hover:bg-cream",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-xs",
                tab.isActive ? "bg-white/20" : "bg-cream text-muted",
              )}
            >
              {counts[tab.key] ?? 0}
            </span>
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {orders.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted">{t.orders.empty}</p>
        ) : (
          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`${base}/${o.id}`}
                  className="flex items-center justify-between gap-3 p-4 hover:bg-cream"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      #{o.order_number} · {o.customer_name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {o.wilaya_name} · {fmtDate(o.created_at)} ·{" "}
                      <span dir="ltr">{o.customer_phone}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-bold text-ink">
                      {formatPrice(o.total)} {currency}
                    </span>
                    <StatusBadge status={o.status} label={t.status[o.status]} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
