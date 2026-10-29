import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { checkoutText } from "@/i18n/checkout";
import { storeText } from "@/i18n/store";
import { getDictionary } from "@/i18n/dictionaries";
import { getDeliveryFees, getProductBySlug } from "@/lib/data/catalog";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import type { CartItem } from "@/lib/cart";

export const metadata: Metadata = { robots: { index: false } };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ buy?: string; product?: string; variant?: string; qty?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const sp = await searchParams;
  const t = checkoutText[lang];
  const st = storeText[lang];
  const dict = await getDictionary(lang);

  // Buy-now: ?buy=<variantId>:<qty>  (legacy: ?product=<slug>&variant=<id>&qty=<n>)
  let buyNow: CartItem[] = [];
  const [buyVariant, buyQty] = (sp.buy ?? "").split(":");
  const variantId = UUID.test(buyVariant ?? "") ? buyVariant : UUID.test(sp.variant ?? "") ? sp.variant : null;
  if (variantId) {
    const qty = Math.min(99, Math.max(1, Number(buyQty ?? sp.qty) || 1));
    // The product id is only used for analytics; prices come from the server quote.
    let productId = variantId;
    if (sp.product) {
      const p = await getProductBySlug(sp.product);
      productId = p?.variants.some((v) => v.id === variantId) ? p.id : variantId;
    }
    buyNow = [{ variantId, productId, qty }];
  }

  const deliveryFees = await getDeliveryFees();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold text-ink">{t.title}</h1>
      <div className="mt-6">
        <CheckoutForm
          lang={lang}
          t={t}
          st={st}
          currency={dict.common.currency}
          mode={buyNow.length ? "buy_now" : "cart"}
          buyNowItems={buyNow}
          deliveryFees={deliveryFees}
        />
      </div>
    </div>
  );
}
