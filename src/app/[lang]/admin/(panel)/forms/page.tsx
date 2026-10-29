import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { adminOpsText } from "@/i18n/admin-ops";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getSubmissions } from "@/lib/data/admin-ops";
import { SubmissionActions } from "@/components/admin/SubmissionActions";
import { Badge, EmptyState, NoAccess, PageHeader, Pagination, Stat, buildHref, fmtDate } from "@/components/admin/ui";

export default async function FormsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const ops = adminOpsText[lang];
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "forms.view")) return <NoAccess t={ops.common} />;
  const sp = await searchParams;
  const result = await getSubmissions({ status: sp.status, page: Number(sp.page) || 1 });
  const base = `/${lang}/admin/forms`;

  return (
    <div className="space-y-5">
      <PageHeader title={ops.forms.title} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={ops.forms.submissions} value={result.total} />
        <Stat label={ops.forms.subscribers} value={result.subscribers} />
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {result.rows.length === 0 ? (
          <EmptyState text={ops.common.empty} />
        ) : (
          <ul className="divide-y divide-line">
            {result.rows.map((s) => (
              <li key={String(s.id)} className="space-y-1 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">
                    {String(s.name ?? "—")}
                    <span className="ms-2 text-xs font-normal text-muted" dir="ltr">
                      {[s.phone, s.email].filter(Boolean).join(" · ")}
                    </span>
                  </p>
                  <Badge tone={s.status === "new" ? "blue" : "neutral"}>{ops.forms.status[String(s.status)]}</Badge>
                </div>
                {/* Customer text is rendered as plain text (React escapes it). */}
                <p className="whitespace-pre-line text-sm text-ink">{String(s.message ?? "")}</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted">
                    {String(s.form)} · {fmtDate(String(s.created_at), true)} · {String(s.locale ?? "")}
                  </p>
                  <SubmissionActions id={String(s.id)} status={String(s.status)} lang={lang} ops={ops} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Pagination page={result.page} pages={result.pages} total={result.total} hrefFor={(p) => buildHref(base, { status: sp.status, page: p })} t={ops.common} />
    </div>
  );
}
