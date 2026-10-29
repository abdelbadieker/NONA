import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { adminOpsText } from "@/i18n/admin-ops";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getCustomersPage } from "@/lib/data/admin-ops";
import { Badge, EmptyState, NoAccess, PageHeader, Pagination, btnSecondary, buildHref, fmtDate, inputCls } from "@/components/admin/ui";
import { cn, formatPrice } from "@/lib/utils";

const SEGMENTS = ["all", "first_time", "returning", "marketing", "inactive", "risky"] as const;

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; segment?: string; tag?: string; page?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const ops = adminOpsText[lang];
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "customers.view")) return <NoAccess t={ops.common} />;

  const sp = await searchParams;
  const segment = SEGMENTS.includes(sp.segment as (typeof SEGMENTS)[number]) ? sp.segment : "all";
  const result = await getCustomersPage({ q: sp.q, segment, tag: sp.tag, page: Number(sp.page) || 1 });
  const base = `/${lang}/admin/customers`;
  const keep = { q: sp.q, segment: segment === "all" ? undefined : segment, tag: sp.tag };
  const currency = lang === "ar" ? "دج" : "DA";

  return (
    <div className="space-y-5">
      <PageHeader
        title={ops.customers.title}
        actions={
          can(staff.permissions, "customers.export") && (
            <a href={buildHref("/api/admin/export/customers", keep)} className={btnSecondary}>
              <Download className="size-4" aria-hidden />
              {ops.common.export}
            </a>
          )
        }
      />

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {SEGMENTS.map((s) => (
          <Link
            key={s}
            href={buildHref(base, { ...keep, segment: s === "all" ? undefined : s, page: undefined })}
            aria-current={segment === s ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium",
              segment === s ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:bg-cream",
            )}
          >
            {ops.customers.segments[s]}
          </Link>
        ))}
      </div>

      <form method="get" className="flex flex-wrap gap-2 rounded-2xl border border-line bg-white p-3">
        {segment !== "all" && <input type="hidden" name="segment" value={segment} />}
        <input name="q" defaultValue={sp.q ?? ""} placeholder={ops.customers.searchPlaceholder} aria-label={ops.common.search} className={cn(inputCls, "max-w-xs")} />
        <input name="tag" defaultValue={sp.tag ?? ""} placeholder={ops.customers.tags} aria-label={ops.customers.tags} className={cn(inputCls, "max-w-[10rem]")} />
        <button type="submit" className={btnSecondary}>
          {ops.common.filter}
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        {result.rows.length === 0 ? (
          <EmptyState text={ops.common.empty} />
        ) : (
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-cream text-xs text-muted">
              <tr>
                <th className="p-3 text-start font-medium">{ops.orders.customer}</th>
                <th className="p-3 text-end font-medium">{ops.customers.orders}</th>
                <th className="p-3 text-end font-medium">{ops.customers.spent}</th>
                <th className="p-3 text-start font-medium">{ops.customers.lastOrder}</th>
                <th className="p-3 text-start font-medium">{ops.customers.marketing}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {result.rows.map((c) => (
                <tr key={c.id} className="hover:bg-cream">
                  <td className="p-3">
                    <Link href={`${base}/${c.id}`} className="font-medium text-ink hover:underline">
                      {c.full_name || "—"}
                    </Link>
                    <span className="block text-xs text-muted" dir="ltr">
                      {c.phone}
                    </span>
                    {c.tags.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {c.tags.map((tag) => (
                          <Badge key={tag}>{tag}</Badge>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-end">
                    {c.orders_count}
                    <span className="block text-xs text-muted">
                      ✓{c.delivered_count} · ✕{c.canceled_count + c.returned_count}
                    </span>
                  </td>
                  <td className="p-3 text-end font-medium">
                    {formatPrice(Number(c.total_spent))} {currency}
                  </td>
                  <td className="p-3 text-xs text-muted">{fmtDate(c.last_order_at)}</td>
                  <td className="p-3">
                    <Badge tone={c.accepts_marketing ? "green" : "neutral"}>
                      {c.accepts_marketing ? ops.customers.consented : ops.customers.notConsented}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination page={result.page} pages={result.pages} total={result.total} hrefFor={(p) => buildHref(base, { ...keep, page: p })} t={ops.common} />
    </div>
  );
}
