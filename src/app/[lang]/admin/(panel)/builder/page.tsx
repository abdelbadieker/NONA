import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { adminOpsText } from "@/i18n/admin-ops";
import { adminBuilderText } from "@/i18n/admin-builder";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getHomeDraft } from "@/lib/data/sections";
import { getAllCategories } from "@/lib/data/admin-ops";
import { requestOrigin } from "@/lib/request-origin";
import { HomeBuilder } from "@/components/admin/HomeBuilder";
import { NoAccess, PageHeader } from "@/components/admin/ui";
import { pickLocale } from "@/lib/utils";

export default async function BuilderPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const ops = adminOpsText[lang];
  const t = adminBuilderText[lang].builder;
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "content.manage")) return <NoAccess t={ops.common} />;
  const [draft, categories, origin] = await Promise.all([getHomeDraft(), getAllCategories(), requestOrigin()]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader title={t.title} subtitle={t.intro} />
      <HomeBuilder
        lang={lang}
        t={t}
        initial={draft.sections}
        initialToken={draft.token}
        origin={origin}
        categories={categories.map((c) => ({ slug: c.slug, name: pickLocale(c, "name", lang) }))}
      />
    </div>
  );
}
