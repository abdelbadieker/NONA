import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { searchProducts } from "@/lib/data/catalog";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SearchBar } from "@/components/shop/SearchBar";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const { q } = await searchParams;
  const dict = await getDictionary(lang);
  const query = (q ?? "").trim();
  const products = query ? await searchProducts(query) : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold text-ink">{dict.nav.search}</h1>

      <div className="mt-4">
        <SearchBar
          lang={lang}
          initial={query}
          placeholder={dict.header.searchPlaceholder}
        />
      </div>

      <div className="mt-6">
        {query &&
          (products.length ? (
            <>
              <p className="mb-4 text-sm text-muted">
                {products.length} {dict.shop.results}
              </p>
              <ProductGrid products={products} lang={lang} dict={dict} />
            </>
          ) : (
            <p className="py-20 text-center text-muted">{dict.shop.empty}</p>
          ))}
      </div>
    </div>
  );
}
