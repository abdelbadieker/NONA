import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShoppingBag, Sparkles } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ar";
import type { ProductCardData } from "@/lib/data/catalog";
import type { HeroLocale } from "@/lib/appearance-types";
import { formatPrice, pickLocale } from "@/lib/utils";

export function Hero({
  lang,
  dict,
  product,
  content,
  heroImage,
}: {
  lang: Locale;
  dict: Dictionary;
  product?: ProductCardData;
  content?: HeroLocale;
  heroImage?: string;
}) {
  const base = `/${lang}`;
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  const badge = content?.badge || dict.home.heroBadge;
  const title = content?.title || dict.home.heroTitle;
  const subtitle = content?.subtitle || dict.home.heroSubtitle;
  const cta = content?.cta || dict.home.heroCta;

  // Custom hero image (links to shop) wins; otherwise feature a product.
  const useProduct = !heroImage && !!product?.images?.length;
  const img = heroImage || product?.images?.[0]?.url;
  const imgHref = useProduct ? `${base}/product/${product!.slug}` : `${base}/shop`;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blush-light via-cream to-white">
      <div className="pointer-events-none absolute -end-20 -top-20 size-72 rounded-full bg-blush/40 blur-3xl" />
      <div className="pointer-events-none absolute -start-24 bottom-0 size-80 rounded-full bg-gold/20 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 md:py-16">
        <div className="text-center md:text-start">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-blush-dark shadow-sm">
            <Sparkles className="size-4 text-gold" aria-hidden />
            {badge}
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg text-muted md:mx-0">
            {subtitle}
          </p>
          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row md:items-start">
            <Link
              href={`${base}/shop`}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-ink/20 transition-transform hover:scale-[1.03] sm:w-auto"
            >
              <ShoppingBag className="size-5" aria-hidden />
              {cta}
            </Link>
            <Link
              href={`${base}/shop`}
              className="flex w-full items-center justify-center gap-1 rounded-full border border-ink/15 bg-white/70 px-7 py-3.5 text-base font-semibold text-ink backdrop-blur transition-colors hover:bg-white sm:w-auto"
            >
              {dict.home.heroSecondary}
              <Arrow className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium text-ink/70 md:justify-start">
            <span>✓ {dict.home.trustCod}</span>
            <span>✓ {dict.home.trustDelivery}</span>
            <span>✓ {dict.home.trustExchange}</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-tr from-blush via-blush-light to-gold/30 opacity-70 blur-2xl" />
          {img ? (
            <Link href={imgHref} className="group relative block">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border-4 border-white shadow-2xl">
                <Image
                  src={img}
                  alt={useProduct ? pickLocale(product!, "name", lang) : title}
                  fill
                  priority
                  sizes="(max-width: 768px) 90vw, 400px"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              {useProduct && (
                <div className="absolute bottom-4 end-4 start-4 flex items-center justify-between gap-2 rounded-2xl bg-white/90 px-4 py-2.5 shadow-lg backdrop-blur">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {pickLocale(product!, "name", lang)}
                    </p>
                    <p className="text-sm font-bold text-blush-dark">
                      {formatPrice(product!.price)} {dict.common.currency}
                    </p>
                  </div>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-white">
                    <Arrow className="size-4" aria-hidden />
                  </span>
                </div>
              )}
            </Link>
          ) : (
            <div className="relative aspect-[4/5] rounded-[2rem] border-4 border-white bg-gradient-to-br from-blush to-blush-light shadow-2xl" />
          )}
        </div>
      </div>
    </section>
  );
}
