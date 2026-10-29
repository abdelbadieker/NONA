import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, RefreshCw, Truck } from "lucide-react";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { storeText } from "@/i18n/store";
import { getProductBySlug } from "@/lib/data/catalog";
import { ProductView } from "@/components/product/ProductView";
import { ViewContentTracker } from "@/components/marketing/Trackers";
import { SITE_URL } from "@/lib/site";
import { pickLocale } from "@/lib/utils";
import type { ProductDetailFields } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !isLocale(lang)) return {};
  const name = pickLocale(product, "name", lang);
  const seo = product.seo?.[lang] ?? {};
  const description = seo.description || pickLocale(product, "description", lang).slice(0, 160);
  const image = product.images[0]?.url;
  return {
    title: seo.title || name,
    description: description || undefined,
    alternates: {
      canonical: `${SITE_URL}/${lang}/product/${product.slug}`,
      languages: Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}/product/${product.slug}`])),
    },
    openGraph: image ? { title: seo.title || name, images: [{ url: image }] } : { title: name },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const dict = await getDictionary(lang);
  const st = storeText[lang];
  const name = pickLocale(product, "name", lang);
  const description = pickLocale(product, "description", lang);
  const images = product.images.map((i) => ({
    url: i.url,
    alt: pickLocale(i as unknown as Record<string, unknown>, "alt", lang) || undefined,
  }));
  const Back = (lang as Locale) === "ar" ? ArrowRight : ArrowLeft;

  // Fashion details with Arabic fallback per field.
  const details: ProductDetailFields = { ...(product.details?.ar ?? {}), ...stripEmpty(product.details?.[lang]) };
  const detailRows = (
    [
      ["material", st.product.material],
      ["fit", st.product.fit],
      ["care", st.product.care],
      ["model", st.product.model],
    ] as const
  ).filter(([k]) => details[k]);

  const activeVariants = product.variants.filter((v) => v.is_active);
  const prices = activeVariants.map((v) => v.price_override ?? product.price);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: description || name,
    image: product.images.map((i) => i.url),
    sku: product.id,
    brand: { "@type": "Brand", name: product.vendor || "NONA" },
    offers: {
      "@type": "AggregateOffer",
      lowPrice: prices.length ? Math.min(...prices) : product.price,
      highPrice: prices.length ? Math.max(...prices) : product.price,
      offerCount: activeVariants.length || 1,
      priceCurrency: "DZD",
      availability:
        product.total_stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${SITE_URL}/${lang}/product/${product.slug}`,
    },
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ViewContentTracker id={product.id} value={product.price} />
      <nav className="mb-4">
        <Link
          href={`/${lang}/shop`}
          className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-blush-dark"
        >
          <Back className="size-4" aria-hidden />
          {dict.product.backToShop}
        </Link>
      </nav>

      <ProductView
        images={images}
        name={name}
        productId={product.id}
        basePrice={product.price}
        comparePrice={product.compare_at_price}
        currency={dict.common.currency}
        variants={product.variants}
        lang={lang}
        dict={dict}
        cartText={st.cart}
      >
        <div className="mt-6 space-y-2 rounded-2xl bg-cream p-4 text-sm text-ink">
          <div className="flex items-center gap-2">
            <Truck className="size-4 text-blush-dark" aria-hidden />
            {dict.footer.delivery}
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw className="size-4 text-blush-dark" aria-hidden />
            {dict.footer.exchange}
          </div>
        </div>

        {description && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-ink">{dict.product.description}</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">{description}</p>
          </section>
        )}

        {detailRows.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-ink">{st.product.details}</h2>
            <dl className="mt-2 divide-y divide-line rounded-xl border border-line text-sm">
              {detailRows.map(([k, label]) => (
                <div key={k} className="grid grid-cols-3 gap-3 p-3">
                  <dt className="text-muted">{label}</dt>
                  <dd className="col-span-2 whitespace-pre-line text-ink">{details[k]}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {details.size_guide && (
          <details className="mt-4 rounded-xl border border-line p-3 text-sm">
            <summary className="cursor-pointer font-semibold text-ink">{st.product.sizeGuide}</summary>
            <p className="mt-2 whitespace-pre-line text-muted">{details.size_guide}</p>
          </details>
        )}
      </ProductView>
    </div>
  );
}

function stripEmpty(o?: ProductDetailFields): ProductDetailFields {
  if (!o) return {};
  return Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v === "string" && v.trim()));
}
