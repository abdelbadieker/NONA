import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, RefreshCw, Truck } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getProductBySlug } from "@/lib/data/catalog";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPurchase } from "@/components/product/ProductPurchase";
import { ViewContentTracker } from "@/components/marketing/Trackers";
import { SITE_URL } from "@/lib/site";
import { pickLocale } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !isLocale(lang)) return {};
  const name = pickLocale(product, "name", lang);
  const description = pickLocale(product, "description", lang);
  const image = product.images[0]?.url;
  return {
    title: name,
    description: description || undefined,
    openGraph: image
      ? { title: name, images: [{ url: image }] }
      : { title: name },
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
  const name = pickLocale(product, "name", lang);
  const description = pickLocale(product, "description", lang);
  const images = product.images.map((i) => ({ url: i.url }));
  const Back = (lang as Locale) === "ar" ? ArrowRight : ArrowLeft;

  const siteUrl = SITE_URL;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: description || name,
    image: product.images.map((i) => i.url),
    sku: product.id,
    brand: { "@type": "Brand", name: "NONA" },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "DZD",
      availability:
        product.total_stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `${siteUrl}/${lang}/product/${product.slug}`,
    },
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={images} alt={name} />

        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">{name}</h1>

          <div className="mt-5">
            <ProductPurchase
              productId={product.id}
              slug={product.slug}
              basePrice={product.price}
              comparePrice={product.compare_at_price}
              currency={dict.common.currency}
              variants={product.variants}
              lang={lang}
              dict={dict}
            />
          </div>

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
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-ink">
                {dict.product.description}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
