import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BadgeCheck, RefreshCw, Truck } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { checkoutText } from "@/i18n/checkout";
import { storeText } from "@/i18n/store";
import { getLandingPreview, getLandingProduct, getPublishedLanding, type LandingPage } from "@/lib/data/landing";
import { getDeliveryFees } from "@/lib/data/catalog";
import { getMarketingPublic } from "@/lib/data/marketing";
import { getStoreSettings } from "@/lib/data/admin";
import { LandingOrderForm } from "@/components/landing/LandingOrderForm";
import { StickyCta } from "@/components/landing/StickyCta";
import { MetaPixel } from "@/components/marketing/MetaPixel";
import { TikTokPixel } from "@/components/marketing/TikTokPixel";
import { GoogleAnalytics } from "@/components/marketing/GoogleAnalytics";
import { UtmCapture } from "@/components/marketing/UtmCapture";
import { PageViewTracker } from "@/components/marketing/PageViewTracker";
import { ViewContentTracker } from "@/components/marketing/Trackers";
import { WhatsAppButton } from "@/components/marketing/WhatsAppButton";
import { cn, pickLocale } from "@/lib/utils";

type Params = Promise<{ lang: string; slug: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

async function load(slug: string, search: Record<string, string | string[] | undefined>) {
  const published = await getPublishedLanding(slug);
  if (published) return { lp: published, preview: false };
  const token = typeof search.preview === "string" ? search.preview : null;
  const draft = token ? await getLandingPreview(slug, token) : null;
  return { lp: draft, preview: !!draft && draft.status !== "published" };
}

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Search }): Promise<Metadata> {
  const { slug } = await params;
  const { lp } = await load(slug, await searchParams);
  if (!lp) return {};
  const firstImage = lp.blocks.find((b) => b.type === "image");
  return {
    title: lp.seo.title || lp.title,
    description: lp.seo.description || undefined,
    // Campaign pages are for ads, not search: avoid thin duplicate pages.
    robots: { index: false, follow: false },
    openGraph: {
      title: lp.seo.title || lp.title,
      images: firstImage && firstImage.type === "image" ? [{ url: firstImage.url }] : undefined,
    },
  };
}

const textSize = { sm: "text-sm", md: "text-base", lg: "text-xl font-semibold", xl: "text-2xl font-bold" } as const;

export default async function LandingRoute({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const search = await searchParams;
  const { lp, preview } = await load(slug, search);
  if (!lp) notFound();

  // Always serve a page in its own language (keep campaign tags on redirect).
  if (lp.locale !== lang) {
    const qs = new URLSearchParams(
      Object.entries(search).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
    ).toString();
    redirect(`/${lp.locale}/lp/${lp.slug}${qs ? `?${qs}` : ""}`);
  }

  const [product, fees, dict, marketing, settings] = await Promise.all([
    lp.product_id ? getLandingProduct(lp.product_id) : Promise.resolve(null),
    getDeliveryFees(),
    getDictionary(lang),
    getMarketingPublic(),
    getStoreSettings(),
  ]);
  const st = storeText[lang];
  const t = checkoutText[lang];
  const f = lp.form;
  const productName = product ? pickLocale(product, "name", lang) : "";
  const ctaLabel = f.stickyText || f.buttonText || dict.product.orderNow;

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: f.pageBackground }}>
      {preview && (
        <div className="sticky top-0 z-50 bg-amber-500 px-4 py-1.5 text-center text-xs font-bold text-white">{st.landing.draftBanner}</div>
      )}
      {f.showHeader && (
        <header className="mx-auto flex max-w-lg items-center justify-center py-3">
          <Link href={`/${lang}`} className="flex items-center gap-1 text-2xl font-bold tracking-tight text-ink">
            NONA
            <span className="mb-2 size-1.5 rounded-full bg-gold" aria-hidden />
          </Link>
        </header>
      )}

      <main className="mx-auto max-w-lg overflow-hidden bg-white shadow-sm sm:my-2 sm:rounded-2xl">
        {lp.blocks.map((b, i) => {
          if (b.type === "image") {
            return (
              <Image
                key={b.id}
                src={b.url}
                alt={b.alt || productName || lp.title}
                width={b.width ?? 1080}
                height={b.height ?? 1350}
                sizes="(max-width: 512px) 100vw, 512px"
                priority={i === 0}
                className="block h-auto w-full"
              />
            );
          }
          if (b.type === "text") {
            return (
              <div
                key={b.id}
                className={cn("whitespace-pre-line px-5 py-4 leading-relaxed", textSize[b.size], b.align === "center" ? "text-center" : "text-start")}
                style={{ color: b.color || undefined, backgroundColor: b.background || undefined }}
              >
                {b.text}
              </div>
            );
          }
          return product && product.variants.some((v) => v.is_active) ? (
            <LandingOrderForm
              key={b.id}
              lang={lang}
              slug={lp.slug}
              product={{ id: product.id, slug: product.slug, name: productName, price: product.price, compareAt: product.compare_at_price }}
              variants={product.variants}
              form={f}
              deliveryFees={fees}
              t={t}
              st={st}
              texts={{
                size: dict.product.size,
                color: dict.product.color,
                quantity: dict.product.quantity,
                soldOut: dict.product.soldOut,
                chooseSize: dict.product.chooseSize,
                chooseColor: dict.product.chooseColor,
                orderNow: dict.product.orderNow,
                previewOnly: st.landing.previewOnly,
              }}
              currency={dict.common.currency}
              preview={preview}
            />
          ) : (
            <div key={b.id} id="order" className="p-6 text-center">
              <p className="font-semibold text-ink">{dict.product.soldOut}</p>
              <Link href={`/${lang}/shop`} className="mt-3 inline-block rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white">
                {dict.product.backToShop}
              </Link>
            </div>
          );
        })}

        <div className="grid grid-cols-3 gap-2 border-t border-line px-3 py-4 text-center text-[11px] font-medium text-ink">
          <span className="flex flex-col items-center gap-1">
            <BadgeCheck className="size-5 text-blush-dark" aria-hidden />
            {dict.footer.cod}
          </span>
          <span className="flex flex-col items-center gap-1">
            <Truck className="size-5 text-blush-dark" aria-hidden />
            {dict.footer.delivery}
          </span>
          <span className="flex flex-col items-center gap-1">
            <RefreshCw className="size-5 text-blush-dark" aria-hidden />
            {dict.footer.exchange}
          </span>
        </div>
      </main>

      <p className="py-4 text-center text-xs text-muted">© NONA</p>

      {f.stickyCta && product && <StickyCta label={ctaLabel} color={f.buttonColor} textColor={f.buttonTextColor} shape={f.buttonShape} />}
      <WhatsAppButton phone={settings.social.whatsapp ?? ""} />
      {!preview && <Tracking lp={lp} productId={product?.id ?? null} price={product?.price ?? 0} marketing={marketing} />}
    </div>
  );
}

function Tracking({
  lp,
  productId,
  price,
  marketing,
}: {
  lp: LandingPage;
  productId: string | null;
  price: number;
  marketing: Awaited<ReturnType<typeof getMarketingPublic>>;
}) {
  return (
    <>
      <UtmCapture />
      <PageViewTracker />
      {productId && <ViewContentTracker key={lp.id} id={productId} value={price} />}
      {marketing.metaPixelId && <MetaPixel pixelId={marketing.metaPixelId} />}
      {marketing.tiktokPixelId && <TikTokPixel pixelId={marketing.tiktokPixelId} />}
      {marketing.ga4Id && <GoogleAnalytics measurementId={marketing.ga4Id} />}
    </>
  );
}
