import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { adminText } from "@/i18n/admin";
import { adminOpsText } from "@/i18n/admin-ops";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getProductForEdit } from "@/lib/data/admin";
import { getAllCategories } from "@/lib/data/admin-ops";
import { ProductForm } from "@/components/admin/ProductForm";
import { Badge, NoAccess, PageHeader } from "@/components/admin/ui";
import { pickLocale } from "@/lib/utils";

export default async function EditProductPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const t = adminText[lang];
  const ops = adminOpsText[lang];
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "products.manage")) return <NoAccess t={ops.common} />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [product, cats] = await Promise.all([getProductForEdit(id), getAllCategories()]);
  if (!product) notFound();
  const categories = cats.map((c) => ({ id: c.id, name: pickLocale(c, "name", lang) }));
  const status = product.status ?? (product.is_active ? "active" : "draft");

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.products.edit}
        subtitle={pickLocale(product, "name", lang)}
        back={{ href: `/${lang}/admin/products`, label: t.products.title }}
        actions={<Badge tone={status === "active" ? "green" : "amber"}>{ops.products.status[status]}</Badge>}
      />
      <ProductForm lang={lang} t={t.products} ops={ops} common={t.common} categories={categories} initial={product} />
    </div>
  );
}
