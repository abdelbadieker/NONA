import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { adminOpsText } from "@/i18n/admin-ops";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getAuditPage } from "@/lib/data/admin-ops";
import { Badge, EmptyState, NoAccess, PageHeader, Pagination, btnSecondary, buildHref, fmtDate, inputCls } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const ops = adminOpsText[lang];
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "audit.view")) return <NoAccess t={ops.common} />;
  const sp = await searchParams;
  const result = await getAuditPage({ q: sp.q, status: sp.status, page: Number(sp.page) || 1 });
  const base = `/${lang}/admin/audit`;

  return (
    <div className="space-y-5">
      <PageHeader title={ops.audit.title} />
      <form method="get" className="flex flex-wrap gap-2 rounded-2xl border border-line bg-white p-3">
        <input name="q" defaultValue={sp.q ?? ""} placeholder={`${ops.audit.action} / ${ops.audit.actor}`} aria-label={ops.common.search} className={cn(inputCls, "max-w-xs")} dir="ltr" />
        <select name="status" defaultValue={sp.status ?? ""} aria-label={ops.audit.status} className={cn(inputCls, "w-auto")}>
          <option value="">{ops.common.all}</option>
          <option value="failure">{ops.audit.failure}</option>
        </select>
        <button type="submit" className={btnSecondary}>
          {ops.common.filter}
        </button>
        <Link href={base} className="px-2 py-2 text-sm text-muted">
          {ops.common.reset}
        </Link>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        {result.rows.length === 0 ? (
          <EmptyState text={ops.common.empty} />
        ) : (
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="bg-cream text-xs text-muted">
              <tr>
                <th className="p-3 text-start font-medium">{ops.audit.when}</th>
                <th className="p-3 text-start font-medium">{ops.audit.actor}</th>
                <th className="p-3 text-start font-medium">{ops.audit.action}</th>
                <th className="p-3 text-start font-medium">{ops.audit.resource}</th>
                <th className="p-3 text-start font-medium">{ops.audit.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line" dir="ltr">
              {result.rows.map((r) => (
                <tr key={String(r.id)} className="align-top">
                  <td className="p-3 text-xs text-muted">{fmtDate(String(r.created_at), true)}</td>
                  <td className="p-3 text-xs">{String(r.actor_email ?? "system")}</td>
                  <td className="p-3 font-mono text-xs">{String(r.action)}</td>
                  <td className="p-3 text-xs">
                    {String(r.resource_type)}
                    {r.resource_id ? <span className="block text-muted">{String(r.resource_id).slice(0, 13)}</span> : null}
                    <details>
                      <summary className="cursor-pointer text-muted">metadata</summary>
                      <pre className="max-w-xs overflow-x-auto whitespace-pre-wrap text-[11px]">{JSON.stringify(r.metadata, null, 1)}</pre>
                    </details>
                  </td>
                  <td className="p-3">
                    <Badge tone={r.status === "failure" ? "red" : "green"}>
                      {r.status === "failure" ? ops.audit.failure : ops.audit.success}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination page={result.page} pages={result.pages} total={result.total} hrefFor={(p) => buildHref(base, { q: sp.q, status: sp.status, page: p })} t={ops.common} />
    </div>
  );
}
