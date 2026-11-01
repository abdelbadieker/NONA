import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  getBestSellers,
  getCategories,
  getFeatured,
  getNewArrivals,
} from "@/lib/data/catalog";
import { getHomeContent } from "@/lib/data/appearance";
import { Hero } from "@/components/home/Hero";
import { ProductRail } from "@/components/product/ProductRail";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { Faq } from "@/components/home/Faq";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import { getApprovedReviews } from "@/lib/data/reviews";
import { storeText } from "@/i18n/store";
import { faq } from "@/lib/content";

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const base = `/${lang}`;

  const [categories, featured, bestSellers, newArrivals, home, reviews] =
    await Promise.all([
      getCategories(),
      getFeatured(10),
      getBestSellers(10),
      getNewArrivals(10),
      getHomeContent(),
      getApprovedReviews(null, 6),
    ]);

  const heroProduct = [...featured, ...bestSellers, ...newArrivals].find(
    (p) => p.images?.length,
  );

  return (
    <>
      <Hero
        lang={lang}
        dict={dict}
        product={heroProduct}
        content={home[lang]}
        heroImage={home.heroImage}
      />

      <ProductRail
        title={dict.home.bestSellers}
        products={bestSellers}
        lang={lang}
        dict={dict}
        href={`${base}/shop?sort=bestselling`}
      />

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
        title={dict.home.newArrivals}
        products={newArrivals}
        lang={lang}
        dict={dict}
        href={`${base}/shop`}
      />

      {/* Real, moderated customer reviews (no hard-coded testimonials). */}
      <ReviewsSection
        reviews={reviews}
        productId={null}
        t={{ ...storeText[lang].reviews, title: dict.home.reviews }}
        className="mx-auto max-w-6xl px-4 py-8 sm:px-6"
      />
      <Faq title={dict.home.faq} items={faq[lang]} />
    </>
  );
}
