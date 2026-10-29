import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { adminText } from "@/i18n/admin";
import { adminOpsText } from "@/i18n/admin-ops";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getCustomerDetail } from "@/lib/data/admin-ops";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CustomerEditor } from "@/components/admin/CustomerEditor";
import { Badge, Card, EmptyState, NoAccess, PageHeader, Stat, fmtDate } from "@/components/admin/ui";
import { formatPrice } from "@/lib/utils";

export default async function CustomerPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const t = adminText[lang];
  const ops = adminOpsText[lang];
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "customers.view")) return <NoAccess t={ops.common} />;

  const data = await getCustomerDetail(id);
  if (!data) notFound();
  const { customer: c, orders } = data;
  const currency = lang === "ar" ? "دج" : "DA";
  const consentAt = c.marketing_consent_at as string | null;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        back={{ href: `/${lang}/admin/customers`, label: ops.customers.title }}
        title={c.full_name || c.phone}
        subtitle={<span dir="ltr">{c.phone}</span>}
        actions={
          <Badge tone={c.accepts_marketing ? "green" : "neutral"}>
            {c.accepts_marketing ? ops.customers.consented : ops.customers.notConsented}
          </Badge>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={ops.customers.orders} value={c.orders_count} />
        <Stat label={ops.customers.delivered} value={c.delivered_count} hint={`✕ ${c.canceled_count} · ↩ ${c.returned_count}`} />
        <Stat label={ops.customers.spent} value={`${formatPrice(Number(c.total_spent))} ${currency}`} />
        <Stat label={ops.customers.firstOrder} value={fmtDate(c.first_order_at as string | null)} hint={`${ops.customers.lastOrder}: ${fmtDate(c.last_order_at)}`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Card title={ops.customers.history} bodyClassName="p-0">
          {orders.length === 0 ? (
            <EmptyState text={ops.common.empty} />
          ) : (
            <ul className="divide-y divide-line">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/${lang}/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-cream">
                    <span className="text-sm text-ink">
                      #{o.order_number} · <span className="text-muted">{fmtDate(o.created_at)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {formatPrice(Number(o.total))} {currency}
                      </span>
                      <StatusBadge status={o.status} label={t.status[o.status]} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={ops.customers.profile}>
          <dl className="mb-4 space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">{t.orders.wilaya}</dt>
              <dd className="text-ink">{c.wilaya_code ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">{t.orders.address}</dt>
              <dd className="text-end text-ink">{String(c.address ?? "—")}</dd>
            </div>
            {consentAt && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted">{ops.customers.marketing}</dt>
                <dd className="text-end text-xs text-ink">
                  {fmtDate(consentAt)} · {String(c.marketing_consent_source ?? "")}
                </dd>
              </div>
            )}
          </dl>
          {can(staff.permissions, "customers.manage") ? (
            <CustomerEditor
              id={c.id}
              lang={lang}
              ops={ops}
              acceptsMarketing={c.accepts_marketing}
              initial={{ fullName: c.full_name ?? "", email: String(c.email ?? ""), notes: String(c.notes ?? ""), tags: c.tags ?? [] }}
            />
          ) : (
            Boolean(c.notes) && <p className="text-sm text-muted">{String(c.notes)}</p>
          )}
          <p className="mt-3 text-xs text-muted">{ops.customers.consentNote}</p>
        </Card>
      </div>
    </div>
  );
}
