import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

function SkeletonCard() {
  return (
    <div className="shrink-0 basis-40 sm:basis-48">
      <div className="aspect-[3/4] w-full animate-pulse rounded-xl bg-blush-light" />
      <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-blush-light" />
      <div className="mt-1.5 h-3 w-1/3 animate-pulse rounded bg-blush-light" />
    </div>
  );
}

function Section({
  title,
  note,
  cta,
  href,
  arrow,
}: {
  title: string;
  note: string;
  cta: string;
  href: string;
  arrow: typeof ArrowRight;
}) {
  const Arrow = arrow;
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink sm:text-2xl">{title}</h2>
          <p className="mt-1 text-sm text-muted">{note}</p>
        </div>
        <Link
          href={href}
          className="flex items-center gap-1 text-sm font-medium text-blush-dark hover:underline"
        >
          {cta}
          <Arrow className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="no-scrollbar mt-4 flex gap-4 overflow-x-auto pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </section>
  );
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const base = `/${lang}`;
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blush-light to-cream">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
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

          {/* Trust strip */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-ink/70">
            <span>✓ {dict.home.trustCod}</span>
            <span>✓ {dict.home.trustDelivery}</span>
            <span>✓ {dict.home.trustExchange}</span>
          </div>
        </div>
      </section>

      {/* Product sections (filled with live data in Phase 4) */}
      <Section
        title={dict.home.featured}
        note={dict.home.comingSoon}
        cta={dict.home.viewAll}
        href={`${base}/shop`}
        arrow={Arrow}
      />
      <Section
        title={dict.home.bestSellers}
        note={dict.home.comingSoon}
        cta={dict.home.viewAll}
        href={`${base}/shop`}
        arrow={Arrow}
      />
      <Section
        title={dict.home.newArrivals}
        note={dict.home.comingSoon}
        cta={dict.home.viewAll}
        href={`${base}/shop`}
        arrow={Arrow}
      />
    </>
  );
}
