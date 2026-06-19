import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Banknote,
  CheckCircle2,
  Clock,
  Package,
  ShoppingBag,
} from "lucide-react";
import { isLocale } from "@/i18n/config";
import { adminText } from "@/i18n/admin";
import { getDashboardStats } from "@/lib/data/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPrice } from "@/lib/utils";

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const t = adminText[lang];
  const currency = lang === "ar" ? "دج" : "DA";
  const stats = await getDashboardStats();
  const base = `/${lang}/admin`;

  const cards = [
    { label: t.dashboard.totalOrders, value: String(stats.totalOrders), icon: ShoppingBag },
    { label: t.dashboard.pending, value: String(stats.pending), icon: Clock },
    { label: t.dashboard.delivered, value: String(stats.delivered), icon: CheckCircle2 },
    { label: t.dashboard.revenue, value: `${formatPrice(stats.revenue)} ${currency}`, icon: Banknote },
    { label: t.dashboard.products, value: String(stats.products), icon: Package },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{t.dashboard.title}</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="rounded-2xl border border-line bg-white p-4"
            >
              <Icon className="size-5 text-blush-dark" aria-hidden />
              <p className="mt-3 text-2xl font-bold text-ink">{c.value}</p>
              <p className="text-xs text-muted">{c.label}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="font-semibold text-ink">{t.dashboard.recentOrders}</h2>
          <Link
            href={`${base}/orders`}
            className="text-sm font-medium text-blush-dark hover:underline"
          >
            {t.orders.title}
          </Link>
        </div>

        {stats.recent.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            {t.dashboard.none}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {stats.recent.map((o) => (
              <li key={o.id}>
                <Link
                  href={`${base}/orders/${o.id}`}
                  className="flex items-center justify-between gap-3 p-4 hover:bg-cream"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      #{o.order_number} · {o.customer_name}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {o.wilaya_name}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold text-ink">
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
