import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { adminOpsText } from "@/i18n/admin-ops";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getReviewsPage } from "@/lib/data/admin-ops";
import { ReviewModeration } from "@/components/admin/LiveOps";
import { EmptyState, NoAccess, PageHeader, Pagination, buildHref, fmtDate } from "@/components/admin/ui";
import { cn, pickLocale } from "@/lib/utils";

const STATUSES = ["pending", "approved", "rejected"] as const;

export default async function ReviewsAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const ops = adminOpsText[lang];
  const t = ops.live;
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "products.manage")) return <NoAccess t={ops.common} />;
  const sp = await searchParams;
  const result = await getReviewsPage({ status: sp.status, page: Number(sp.page) || 1 });
  const base = `/${lang}/admin/reviews`;

  return (
    <div className="space-y-5">
      <PageHeader title={t.reviewsTitle} />
      <div className="flex gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={buildHref(base, { status: s })}
            aria-current={result.status === s ? "page" : undefined}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium",
              result.status === s ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:bg-cream",
            )}
          >
            {t.reviewStatus[s]}
            {s === "pending" && result.pending > 0 && ` (${result.pending})`}
          </Link>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {result.rows.length === 0 ? (
          <EmptyState text={ops.common.empty} />
        ) : (
          <ul className="divide-y divide-line">
            {result.rows.map((r) => {
              const product = r.product as Record<string, unknown> | null;
              return (
                <li key={String(r.id)} className="space-y-2 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">
                      {String(r.customer_name)}
                      <span className="ms-2 inline-flex gap-0.5 align-middle" dir="ltr" aria-label={`${r.rating}/5`}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={cn("size-3.5", n <= Number(r.rating) ? "fill-gold text-gold" : "text-line")} aria-hidden />
                        ))}
                      </span>
                    </p>
                    <span className="text-xs text-muted">
                      {product ? pickLocale(product, "name", lang) : t.general} · {fmtDate(String(r.created_at), true)}
                    </span>
                  </div>
                  {Boolean(r.body) && <p className="whitespace-pre-line text-sm text-ink">{String(r.body)}</p>}
                  <ReviewModeration id={String(r.id)} status={String(r.status)} lang={lang} ops={ops} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Pagination page={result.page} pages={result.pages} total={result.total} hrefFor={(p) => buildHref(base, { status: result.status, page: p })} t={ops.common} />
    </div>
  );
}
