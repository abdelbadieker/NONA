import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ar";
import type { ProductCardData } from "@/lib/data/catalog";
import { ProductCard } from "./ProductCard";

export function ProductGrid({
  products,
  lang,
  dict,
}: {
  products: ProductCardData[];
  lang: Locale;
  dict: Dictionary;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} lang={lang} dict={dict} />
      ))}
    </div>
  );
}
