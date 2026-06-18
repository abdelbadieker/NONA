import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCategories, getProductCards } from "@/lib/data/catalog";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SortSelect } from "@/components/shop/SortSelect";
import { cn, pickLocale } from "@/lib/utils";

const SORTS = ["newest", "price_asc", "price_desc", "bestselling"] as const;
type Sort = (typeof SORTS)[number];

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ category?: string; sort?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const { category, sort } = await searchParams;
  const dict = await getDictionary(lang);
  const base = `/${lang}`;
  const sortVal: Sort = SORTS.includes(sort as Sort) ? (sort as Sort) : "newest";

  const [categories, products] = await Promise.all([
    getCategories(),
    getProductCards({ categorySlug: category, sort: sortVal, limit: 60 }),
  ]);

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
      active
        ? "border-blush-dark bg-blush-dark text-white"
        : "border-line bg-white text-ink hover:bg-blush-light",
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold text-ink">{dict.nav.shop}</h1>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        <Link href={`${base}/shop`} className={chip(!category)}>
          {dict.shop.all}
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`${base}/shop?category=${c.slug}`}
            className={chip(category === c.slug)}
          >
            {pickLocale(c, "name", lang)}
          </Link>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <span className="text-sm text-muted">
          {products.length} {dict.shop.results}
        </span>
        <SortSelect
          lang={lang}
          dict={dict}
          current={sortVal}
          category={category}
        />
      </div>

      <div className="mt-6">
        {products.length ? (
          <ProductGrid products={products} lang={lang} dict={dict} />
        ) : (
          <p className="py-24 text-center text-muted">{dict.shop.empty}</p>
        )}
      </div>
    </div>
  );
}
