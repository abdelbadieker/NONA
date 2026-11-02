import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, RefreshCw, Truck } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ar";
import { storeText } from "@/i18n/store";
import {
  getBestSellers,
  getCategories,
  getFeatured,
  getNewArrivals,
  getProductCards,
  type ProductCardData,
} from "@/lib/data/catalog";
import { getHomeContent } from "@/lib/data/appearance";
import { getApprovedReviews } from "@/lib/data/reviews";
import { faq } from "@/lib/content";
import { pickText, type Section } from "@/lib/sections";
import { cn, pickLocale } from "@/lib/utils";
import { Hero } from "./Hero";
import { CategoryGrid } from "./CategoryGrid";
import { Faq } from "./Faq";
import { ProductRail } from "@/components/product/ProductRail";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import { NewsletterForm } from "@/components/forms/NewsletterForm";

type Props = { sections: Section[]; lang: Locale; dict: Dictionary };

/** Section colours override the theme tokens inside the section only. */
function styleFor(s: Section): React.CSSProperties | undefined {
  const st: Record<string, string> = {};
  if (s.background) st.backgroundColor = s.background;
  if (s.textColor) {
    st["--color-ink"] = s.textColor;
    st["--color-muted"] = s.textColor;
    st.color = s.textColor;
  }
  return Object.keys(st).length ? (st as React.CSSProperties) : undefined;
}

const safeHref = (href: string, lang: string) =>
  !href ? "" : href.startsWith("https://") ? href : /^\/(ar|fr|en)(\/|$)/.test(href) ? href : `/${lang}${href}`;

export async function SectionsRenderer({ sections, lang, dict }: Props) {
  const visible = sections.filter((s) => s.enabled);
  const sources = new Set(visible.flatMap((s) => (s.type === "products" ? [s.source === "category" ? `c:${s.category}` : s.source] : [])));
  const needs = (t: Section["type"]) => visible.some((s) => s.type === t);

  const [best, featured, fresh, categories, home, reviews] = await Promise.all([
    sources.has("best_sellers") || needs("hero") ? getBestSellers(24) : Promise.resolve([] as ProductCardData[]),
    sources.has("featured") || needs("hero") ? getFeatured(24) : Promise.resolve([] as ProductCardData[]),
    sources.has("new") || needs("hero") ? getNewArrivals(24) : Promise.resolve([] as ProductCardData[]),
    needs("categories") || [...sources].some((x) => x.startsWith("c:")) ? getCategories() : Promise.resolve([]),
    needs("hero") ? getHomeContent() : Promise.resolve(null),
    needs("reviews") ? getApprovedReviews(null, 12) : Promise.resolve([]),
  ]);
  const byCategory = new Map<string, ProductCardData[]>();
  await Promise.all(
    [...sources]
      .filter((x) => x.startsWith("c:") && x.length > 2)
      .map(async (x) => byCategory.set(x.slice(2), await getProductCards({ categorySlug: x.slice(2), sort: "bestselling", limit: 24 }))),
  );
  const st = storeText[lang];
  const base = `/${lang}`;

  return (
    <>
      {visible.map((s) => {
        const style = styleFor(s);
        switch (s.type) {
          case "hero": {
            const legacy = home?.[lang] ?? {};
            const heroProduct = [...featured, ...best, ...fresh].find((p) => p.images?.length);
            return (
              <div key={s.id} style={style}>
                <Hero
                  lang={lang}
                  dict={dict}
                  product={heroProduct}
                  plain={!!s.background}
                  ctaHref={safeHref(s.ctaLink, lang) || undefined}
                  heroImage={s.image || home?.heroImage}
                  content={{
                    badge: pickText(s.badge, lang) || legacy.badge,
                    title: pickText(s.title, lang) || legacy.title,
                    subtitle: pickText(s.subtitle, lang) || legacy.subtitle,
                    cta: pickText(s.cta, lang) || legacy.cta,
                  }}
                />
              </div>
            );
          }
          case "products": {
            const list =
              s.source === "best_sellers" ? best : s.source === "featured" ? featured : s.source === "new" ? fresh : byCategory.get(s.category) ?? [];
            const cat = categories.find((c) => c.slug === s.category);
            const fallback =
              s.source === "best_sellers"
                ? dict.home.bestSellers
                : s.source === "featured"
                  ? dict.home.featured
                  : s.source === "new"
                    ? dict.home.newArrivals
                    : cat
                      ? pickLocale(cat, "name", lang)
                      : dict.nav.shop;
            const href =
              s.source === "category" && s.category
                ? `${base}/shop?category=${s.category}`
                : s.source === "best_sellers"
                  ? `${base}/shop?sort=bestselling`
                  : `${base}/shop`;
            return (
              <div key={s.id} style={style}>
                <ProductRail title={pickText(s.title, lang) || fallback} products={list.slice(0, s.limit)} lang={lang} dict={dict} href={href} />
              </div>
            );
          }
          case "categories":
            return (
              <section key={s.id} style={style} className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                <h2 className="text-xl font-bold text-ink sm:text-2xl">{pickText(s.title, lang) || dict.home.categories}</h2>
                <div className="mt-4">
                  <CategoryGrid categories={categories} lang={lang} />
                </div>
              </section>
            );
          case "banner": {
            if (!s.image) return null;
            const img = (
              <Image
                src={s.image}
                alt={pickText(s.alt, lang)}
                width={1600}
                height={700}
                sizes="(max-width: 1152px) 100vw, 1152px"
                className={cn("h-auto w-full", s.rounded && "rounded-2xl")}
              />
            );
            const href = safeHref(s.link, lang);
            return (
              <section key={s.id} style={style} className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
                {href ? (
                  <Link href={href} className="block">
                    {img}
                  </Link>
                ) : (
                  img
                )}
              </section>
            );
          }
          case "text":
            return (
              <section key={s.id} style={style} className={cn("px-4 py-10 sm:px-6", s.align === "center" && "text-center")}>
                <div className="mx-auto max-w-3xl">
                  {pickText(s.title, lang) && <h2 className="text-2xl font-bold text-ink">{pickText(s.title, lang)}</h2>}
                  {pickText(s.body, lang) && <p className="mt-3 whitespace-pre-line leading-relaxed text-muted">{pickText(s.body, lang)}</p>}
                </div>
              </section>
            );
          case "trust":
            return (
              <section key={s.id} style={style} className="border-y border-line px-4 py-6">
                <div className="mx-auto grid max-w-6xl grid-cols-3 gap-3 text-center text-sm font-medium text-ink">
                  {[
                    { Icon: BadgeCheck, label: dict.footer.cod },
                    { Icon: Truck, label: dict.footer.delivery },
                    { Icon: RefreshCw, label: dict.footer.exchange },
                  ].map(({ Icon, label }) => (
                    <span key={label} className="flex flex-col items-center gap-1.5">
                      <Icon className="size-6 text-blush-dark" aria-hidden />
                      {label}
                    </span>
                  ))}
                </div>
              </section>
            );
          case "reviews":
            return (
              <div key={s.id} style={style}>
                <ReviewsSection
                  reviews={reviews.slice(0, s.limit)}
                  productId={null}
                  t={{ ...st.reviews, title: pickText(s.title, lang) || dict.home.reviews }}
                  className="mx-auto max-w-6xl px-4 py-8 sm:px-6"
                />
              </div>
            );
          case "faq":
            return (
              <div key={s.id} style={style}>
                <Faq title={pickText(s.title, lang) || dict.home.faq} items={faq[lang]} />
              </div>
            );
          case "newsletter":
            return (
              <section key={s.id} style={style} className="px-4 py-10">
                <div className="mx-auto max-w-md text-center">
                  {pickText(s.title, lang) && <h2 className="mb-2 text-xl font-bold text-ink">{pickText(s.title, lang)}</h2>}
                  {pickText(s.text, lang) && <p className="mb-4 text-sm text-muted">{pickText(s.text, lang)}</p>}
                  <div className="text-start">
                    <NewsletterForm lang={lang} t={st.forms} />
                  </div>
                </div>
              </section>
            );
        }
      })}
    </>
  );
}
