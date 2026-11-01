import { notFound } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { adminOpsText } from "@/i18n/admin-ops";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getBlockedPhones, getLeadsPage } from "@/lib/data/admin-ops";
import { BlockedPhonesManager, DeleteLeadButton } from "@/components/admin/LiveOps";
import { Badge, Card, EmptyState, NoAccess, PageHeader, Pagination, btnSecondary, buildHref, fmtDate, inputCls } from "@/components/admin/ui";

export default async function LeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const ops = adminOpsText[lang];
  const t = ops.live;
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "orders.view")) return <NoAccess t={ops.common} />;
  const sp = await searchParams;
  const [result, blocked] = await Promise.all([getLeadsPage({ q: sp.q, page: Number(sp.page) || 1 }), getBlockedPhones()]);
  const canManage = can(staff.permissions, "orders.manage");
  const base = `/${lang}/admin/leads`;

  return (
    <div className="space-y-5">
      <PageHeader title={t.leadsTitle} subtitle={t.leadsIntro} />
      <form method="get" className="flex gap-2 rounded-2xl border border-line bg-white p-3">
        <input name="q" defaultValue={sp.q ?? ""} placeholder={ops.customers.searchPlaceholder} aria-label={ops.common.search} className={`${inputCls} max-w-xs`} />
        <button type="submit" className={btnSecondary}>
          {ops.common.filter}
        </button>
      </form>
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {result.rows.length === 0 ? (
          <EmptyState text={ops.common.empty} />
        ) : (
          <ul className="divide-y divide-line">
            {result.rows.map((l) => {
              const intl = `213${l.customer_phone.slice(1)}`;
              return (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {l.customer_name || "—"}{" "}
                      <span className="font-normal text-muted" dir="ltr">
                        {l.customer_phone}
                      </span>
                    </p>
                    <p className="text-xs text-muted">
                      {[l.product_name, l.wilaya_code ? `W${l.wilaya_code}` : null, l.commune].filter(Boolean).join(" · ")}
                      {" · "}
                      {t.updated}: {fmtDate(l.updated_at, true)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.ad_source && <Badge tone="blue">{l.ad_source}</Badge>}
                    <a href={`tel:${l.customer_phone}`} className={btnSecondary} aria-label={t.call}>
                      <Phone className="size-4" aria-hidden />
                    </a>
                    <a href={`https://wa.me/${intl}`} target="_blank" rel="noopener noreferrer" className={btnSecondary} aria-label={t.whatsapp}>
                      <MessageCircle className="size-4" aria-hidden />
                    </a>
                    {canManage && <DeleteLeadButton id={l.id} lang={lang} ops={ops} />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Pagination page={result.page} pages={result.pages} total={result.total} hrefFor={(p) => buildHref(base, { q: sp.q, page: p })} t={ops.common} />
      <Card title={t.blockedTitle}>
        <BlockedPhonesManager rows={blocked} lang={lang} ops={ops} canManage={canManage} />
      </Card>
    </div>
  );
}
