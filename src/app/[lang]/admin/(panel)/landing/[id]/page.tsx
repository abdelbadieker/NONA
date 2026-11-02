import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { adminOpsText } from "@/i18n/admin-ops";
import { adminBuilderText } from "@/i18n/admin-builder";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getLandingForEdit } from "@/lib/data/landing";
import { getProductOptions } from "@/lib/data/admin-ops";
import { LandingEditor } from "@/components/admin/LandingEditor";
import { NoAccess, PageHeader } from "@/components/admin/ui";
import { pickLocale } from "@/lib/utils";
import { requestOrigin } from "@/lib/request-origin";

export default async function LandingEditPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const ops = adminOpsText[lang];
  const t = adminBuilderText[lang].landing;
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "content.manage")) return <NoAccess t={ops.common} />;

  const isNew = id === "new";
  const [lp, products, origin] = await Promise.all([
    isNew ? Promise.resolve(null) : getLandingForEdit(id),
    getProductOptions(),
    requestOrigin(),
  ]);
  if (!isNew && !lp) notFound();

  return (
    <div className="space-y-5">
      <PageHeader back={{ href: `/${lang}/admin/landing`, label: t.title }} title={isNew ? t.new : (lp?.title ?? "")} />
      <LandingEditor
        lang={lang}
        t={t}
        origin={origin}
        products={products.map((p) => ({ id: p.id, name: pickLocale(p, "name", lang), price: Number(p.price), image: null }))}
        initial={lp}
      />
    </div>
  );
}
