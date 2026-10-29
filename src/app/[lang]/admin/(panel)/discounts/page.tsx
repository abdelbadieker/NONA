import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { adminOpsText } from "@/i18n/admin-ops";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getDiscounts } from "@/lib/data/admin-ops";
import { Badge, EmptyState, NoAccess, PageHeader, btnPrimary, fmtDate } from "@/components/admin/ui";
import { formatPrice } from "@/lib/utils";

const hasEnded = (endsAt: unknown) => Boolean(endsAt) && new Date(String(endsAt)).getTime() < Date.now();

export default async function DiscountsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const ops = adminOpsText[lang];
  const t = ops.discounts;
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "discounts.manage")) return <NoAccess t={ops.common} />;

  const discounts = await getDiscounts();
  const base = `/${lang}/admin/discounts`;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.title}
        subtitle={t.rules}
        actions={
          <Link href={`${base}/new`} className={btnPrimary}>
            <Plus className="size-4" aria-hidden />
            {t.new}
          </Link>
        }
      />
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {discounts.length === 0 ? (
          <EmptyState text={ops.common.empty} />
        ) : (
          <ul className="divide-y divide-line">
            {discounts.map((d) => {
              const ended = hasEnded(d.ends_at);
              const value =
                d.kind === "percentage" ? `${Number(d.value)}%` : d.kind === "fixed" ? `${formatPrice(Number(d.value))} DA` : t.kinds.free_shipping;
              return (
                <li key={String(d.id)}>
                  <Link href={`${base}/${d.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-cream">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink" dir="ltr">
                        {d.code ? String(d.code) : `⚡ ${String(d.title)}`}
                      </p>
                      <p className="text-xs text-muted">
                        {String(d.title)} · {value}
                        {Number(d.min_subtotal) > 0 && ` · ≥ ${formatPrice(Number(d.min_subtotal))} DA`}
                        {d.ends_at ? ` · ${t.endsAt} ${fmtDate(String(d.ends_at))}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-muted">
                        {t.used}: {String(d.usage_count)}
                        {d.usage_limit ? `/${String(d.usage_limit)}` : ""}
                      </span>
                      <Badge tone={!d.is_active || ended ? "neutral" : "green"}>
                        {d.is_active && !ended ? ops.common.active : ops.common.inactive}
                      </Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
