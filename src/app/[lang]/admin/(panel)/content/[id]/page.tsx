import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { adminOpsText } from "@/i18n/admin-ops";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getPageForEdit } from "@/lib/data/admin-ops";
import { PageEditor } from "@/components/admin/PageEditor";
import { Badge, NoAccess, PageHeader } from "@/components/admin/ui";
import { pickLocale } from "@/lib/utils";

export default async function EditContentPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const ops = adminOpsText[lang];
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "content.manage")) return <NoAccess t={ops.common} />;
  const isNew = id === "new";
  const page = isNew ? null : await getPageForEdit(id);
  if (!isNew && !page) notFound();

  return (
    <div className="space-y-5">
      <PageHeader
        back={{ href: `/${lang}/admin/content`, label: ops.content.title }}
        title={isNew ? ops.content.new : pickLocale(page, "title", lang)}
        actions={page && <Badge tone={page.is_published ? "green" : "amber"}>{page.is_published ? ops.common.published : ops.common.draft}</Badge>}
      />
      <PageEditor lang={lang} ops={ops} initial={page} />
    </div>
  );
}
