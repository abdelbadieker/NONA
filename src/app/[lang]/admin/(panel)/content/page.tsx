import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { adminOpsText } from "@/i18n/admin-ops";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getPagesList } from "@/lib/data/admin-ops";
import { Badge, EmptyState, NoAccess, PageHeader, btnPrimary, fmtDate } from "@/components/admin/ui";
import { pickLocale } from "@/lib/utils";

export default async function ContentPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const ops = adminOpsText[lang];
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "content.manage")) return <NoAccess t={ops.common} />;
  const pages = await getPagesList();
  const base = `/${lang}/admin/content`;

  return (
    <div className="space-y-5">
      <PageHeader
        title={ops.content.title}
        subtitle={ops.content.reviewNote}
        actions={
          <Link href={`${base}/new`} className={btnPrimary}>
            <Plus className="size-4" aria-hidden />
            {ops.content.new}
          </Link>
        }
      />
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {pages.length === 0 ? (
          <EmptyState text={ops.common.empty} />
        ) : (
          <ul className="divide-y divide-line">
            {pages.map((p) => (
              <li key={String(p.id)}>
                <Link href={`${base}/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-cream">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{pickLocale(p, "title", lang)}</span>
                    <span className="block text-xs text-muted" dir="ltr">
                      /pages/{String(p.slug)} · {fmtDate(String(p.updated_at))}
                    </span>
                  </span>
                  <Badge tone={p.is_published ? "green" : "amber"}>{p.is_published ? ops.common.published : ops.common.draft}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
