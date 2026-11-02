import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { adminOpsText } from "@/i18n/admin-ops";
import { adminBuilderText } from "@/i18n/admin-builder";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { listLandingPages } from "@/lib/data/landing";
import { LandingRowActions } from "@/components/admin/LandingRowActions";
import { Badge, EmptyState, NoAccess, PageHeader, btnPrimary, fmtDate, pct } from "@/components/admin/ui";
import { pickLocale } from "@/lib/utils";
import { requestOrigin } from "@/lib/request-origin";

export default async function LandingListPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const ops = adminOpsText[lang];
  const t = adminBuilderText[lang].landing;
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "content.manage")) return <NoAccess t={ops.common} />;
  const [pages, origin] = await Promise.all([listLandingPages(), requestOrigin()]);
  const base = `/${lang}/admin/landing`;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.title}
        subtitle={t.intro}
        actions={
          <Link href={`${base}/new`} className={btnPrimary}>
            <Plus className="size-4" aria-hidden />
            {t.new}
          </Link>
        }
      />
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        {pages.length === 0 ? (
          <EmptyState
            text={t.empty}
            action={
              <Link href={`${base}/new`} className={btnPrimary}>
                {t.new}
              </Link>
            }
          />
        ) : (
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="bg-cream text-xs text-muted">
              <tr>
                <th className="p-3 text-start font-medium">{t.pageTitle}</th>
                <th className="p-3 text-end font-medium">{t.visits}</th>
                <th className="p-3 text-end font-medium">{t.orders}</th>
                <th className="p-3 text-end font-medium">{t.conversion}</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pages.map((p) => {
                const link = `${origin}/${p.locale}/lp/${p.slug}`;
                return (
                  <tr key={p.id} className="hover:bg-cream/50">
                    <td className="p-3">
                      <Link href={`${base}/${p.id}`} className="font-semibold text-ink hover:underline">
                        {p.title}
                      </Link>
                      <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <Badge tone={p.status === "published" ? "green" : "amber"}>{t.status[p.status]}</Badge>
                        {p.product && <span>{pickLocale(p.product, "name", lang)}</span>}
                        <span dir="ltr">/{p.locale}/lp/{p.slug}</span>
                        <span>· {fmtDate(p.updated_at)}</span>
                      </span>
                    </td>
                    <td className="p-3 text-end font-medium">{p.visits}</td>
                    <td className="p-3 text-end font-medium">{p.orders}</td>
                    <td className="p-3 text-end">{pct(p.visits ? p.orders / p.visits : null)}</td>
                    <td className="p-3">
                      <LandingRowActions id={p.id} link={link} published={p.status === "published"} lang={lang} t={t} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
