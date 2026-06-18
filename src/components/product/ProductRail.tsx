import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ar";
import type { ProductCardData } from "@/lib/data/catalog";
import { ProductCard } from "./ProductCard";

export function ProductRail({
  title,
  products,
  lang,
  dict,
  href,
}: {
  title: string;
  products: ProductCardData[];
  lang: Locale;
  dict: Dictionary;
  href?: string;
}) {
  if (!products.length) return null;
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-end justify-between">
        <h2 className="text-xl font-bold text-ink sm:text-2xl">{title}</h2>
        {href && (
          <Link
            href={href}
            className="flex items-center gap-1 text-sm font-medium text-blush-dark hover:underline"
          >
            {dict.home.viewAll}
            <Arrow className="size-4" aria-hidden />
          </Link>
        )}
      </div>
      <div className="no-scrollbar mt-4 flex gap-4 overflow-x-auto pb-2">
        {products.map((p) => (
          <div key={p.id} className="w-40 shrink-0 sm:w-48">
            <ProductCard product={p} lang={lang} dict={dict} />
          </div>
        ))}
      </div>
    </section>
  );
}
