import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { storeText } from "@/i18n/store";
import { getDeliverySettings } from "@/lib/data/catalog";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = { robots: { index: false } };

export default async function CartPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, delivery] = await Promise.all([getDictionary(lang), getDeliverySettings()]);
  const st = storeText[lang];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold text-ink">{st.cart.title}</h1>
      <div className="mt-6">
        <CartView lang={lang} st={st} currency={dict.common.currency} freeThreshold={delivery.freeThreshold} />
      </div>
    </div>
  );
}
