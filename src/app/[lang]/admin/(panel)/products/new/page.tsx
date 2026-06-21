import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { adminText } from "@/i18n/admin";
import { getCategories } from "@/lib/data/catalog";
import { ProductForm } from "@/components/admin/ProductForm";
import { pickLocale } from "@/lib/utils";

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const t = adminText[lang];
  const cats = await getCategories();
  const categories = cats.map((c) => ({
    id: c.id,
    name: pickLocale(c, "name", lang),
  }));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink">{t.products.add}</h1>
      <ProductForm
        lang={lang}
        t={t.products}
        common={t.common}
        categories={categories}
        initial={null}
      />
    </div>
  );
}
