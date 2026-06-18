import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { checkoutText } from "@/i18n/checkout";
import { getDictionary } from "@/i18n/dictionaries";
import { getDeliveryFees, getProductBySlug } from "@/lib/data/catalog";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { pickLocale } from "@/lib/utils";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ product?: string; variant?: string; qty?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const { product: slug, variant: variantId, qty } = await searchParams;
  const t = checkoutText[lang];
  const dict = await getDictionary(lang);

  const product = slug ? await getProductBySlug(slug) : null;
  const variant = product?.variants.find((v) => v.id === variantId);

  if (!product || !variant) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-ink">{t.emptyTitle}</h1>
        <p className="text-muted">{t.emptyText}</p>
        <Link
          href={`/${lang}/shop`}
          className="mt-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white"
        >
          {t.goShop}
        </Link>
      </div>
    );
  }

  const deliveryFees = await getDeliveryFees();
  const name = pickLocale(product, "name", lang);
  const image = product.images[0]?.url ?? null;
  const unitPrice = variant.price_override ?? product.price;
  const initialQty = Math.min(
    Math.max(1, Number(qty) || 1),
    Math.max(1, variant.stock),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold text-ink">{t.title}</h1>
      <div className="mt-6">
        <CheckoutForm
          lang={lang}
          t={t}
          currency={dict.common.currency}
          product={{ slug: product.slug, name, image }}
          variant={{
            id: variant.id,
            size: variant.size,
            color: variant.color,
            stock: variant.stock,
            unitPrice,
          }}
          initialQty={initialQty}
          deliveryFees={deliveryFees}
        />
      </div>
    </div>
  );
}
