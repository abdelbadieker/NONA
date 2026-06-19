import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  getBestSellers,
  getCategories,
  getFeatured,
  getNewArrivals,
} from "@/lib/data/catalog";
import { ProductRail } from "@/components/product/ProductRail";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { Reviews } from "@/components/home/Reviews";
import { Faq } from "@/components/home/Faq";
import { faq, reviews } from "@/lib/content";

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const base = `/${lang}`;

  const [categories, featured, bestSellers, newArrivals] = await Promise.all([
    getCategories(),
    getFeatured(10),
    getBestSellers(10),
    getNewArrivals(10),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blush-light to-cream">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <span className="inline-block rounded-full bg-white px-4 py-1 text-sm font-medium text-blush-dark shadow-sm">
            {dict.home.heroBadge}
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-ink sm:text-6xl">
            {dict.home.heroTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
            {dict.home.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={`${base}/shop`}
              className="w-full rounded-full bg-ink px-7 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02] sm:w-auto"
            >
              {dict.home.heroCta}
            </Link>
            <Link
              href={`${base}/shop`}
              className="w-full rounded-full border border-ink/15 bg-white px-7 py-3 text-sm font-semibold text-ink transition-colors hover:bg-blush-light sm:w-auto"
            >
              {dict.home.heroSecondary}
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-ink/70">
            <span>✓ {dict.home.trustCod}</span>
            <span>✓ {dict.home.trustDelivery}</span>
            <span>✓ {dict.home.trustExchange}</span>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h2 className="text-xl font-bold text-ink sm:text-2xl">
          {dict.home.categories}
        </h2>
        <div className="mt-4">
          <CategoryGrid categories={categories} lang={lang} />
        </div>
      </section>

      <ProductRail
        title={dict.home.featured}
        products={featured}
        lang={lang}
        dict={dict}
        href={`${base}/shop`}
      />
      <ProductRail
        title={dict.home.bestSellers}
        products={bestSellers}
        lang={lang}
        dict={dict}
        href={`${base}/shop?sort=bestselling`}
      />
      <ProductRail
        title={dict.home.newArrivals}
        products={newArrivals}
        lang={lang}
        dict={dict}
        href={`${base}/shop`}
      />

      <Reviews title={dict.home.reviews} items={reviews[lang]} />
      <Faq title={dict.home.faq} items={faq[lang]} />
    </>
  );
}
