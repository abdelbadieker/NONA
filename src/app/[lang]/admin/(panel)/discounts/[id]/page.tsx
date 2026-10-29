import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { adminOpsText } from "@/i18n/admin-ops";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getAllCategories, getDiscount, getProductOptions } from "@/lib/data/admin-ops";
import { DiscountForm } from "@/components/admin/DiscountForm";
import { NoAccess, PageHeader } from "@/components/admin/ui";
import { pickLocale } from "@/lib/utils";

export default async function DiscountEditPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const ops = adminOpsText[lang];
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "discounts.manage")) return <NoAccess t={ops.common} />;

  const isNew = id === "new";
  const [discount, products, categories] = await Promise.all([
    isNew ? Promise.resolve(null) : getDiscount(id),
    getProductOptions(),
    getAllCategories(),
  ]);
  if (!isNew && !discount) notFound();

  return (
    <div className="space-y-5">
      <PageHeader
        back={{ href: `/${lang}/admin/discounts`, label: ops.discounts.title }}
        title={isNew ? ops.discounts.new : String(discount?.code ?? discount?.title ?? "")}
      />
      <DiscountForm
        lang={lang}
        ops={ops}
        initial={discount}
        products={products.map((p) => ({ id: p.id, label: pickLocale(p, "name", lang) }))}
        categories={categories.map((c) => ({ id: c.id, label: pickLocale(c, "name", lang) }))}
      />
    </div>
  );
}
