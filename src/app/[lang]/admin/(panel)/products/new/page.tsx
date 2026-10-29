import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { adminText } from "@/i18n/admin";
import { adminOpsText } from "@/i18n/admin-ops";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getAllCategories } from "@/lib/data/admin-ops";
import { ProductForm } from "@/components/admin/ProductForm";
import { NoAccess, PageHeader } from "@/components/admin/ui";
import { pickLocale } from "@/lib/utils";

export default async function NewProductPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = adminText[lang];
  const ops = adminOpsText[lang];
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "products.manage")) return <NoAccess t={ops.common} />;

  const cats = await getAllCategories();
  const categories = cats.map((c) => ({ id: c.id, name: pickLocale(c, "name", lang) }));

  return (
    <div className="space-y-5">
      <PageHeader title={t.products.add} back={{ href: `/${lang}/admin/products`, label: t.products.title }} />
      <ProductForm lang={lang} t={t.products} ops={ops} common={t.common} categories={categories} initial={null} />
    </div>
  );
}
