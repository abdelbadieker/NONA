import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { adminText } from "@/i18n/admin";
import { getProductForEdit } from "@/lib/data/admin";
import { getCategories } from "@/lib/data/catalog";
import { ProductForm } from "@/components/admin/ProductForm";
import { pickLocale } from "@/lib/utils";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  const product = await getProductForEdit(id);
  if (!product) notFound();

  const t = adminText[lang];
  const cats = await getCategories();
  const categories = cats.map((c) => ({
    id: c.id,
    name: pickLocale(c, "name", lang),
  }));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink">{t.products.edit}</h1>
      <ProductForm
        lang={lang}
        t={t.products}
        common={t.common}
        categories={categories}
        initial={product}
      />
    </div>
  );
}
