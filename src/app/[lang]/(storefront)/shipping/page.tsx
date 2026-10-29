import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { storeText } from "@/i18n/store";
import { getDeliveryFees, getDeliverySettings } from "@/lib/data/catalog";
import { formatPrice, interpolate } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return isLocale(lang) ? { title: storeText[lang].pages.shippingTitle } : {};
}

/** Live delivery fees straight from the database — never out of date. */
export default async function ShippingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, fees, settings] = await Promise.all([getDictionary(lang), getDeliveryFees(), getDeliverySettings()]);
  const t = storeText[lang].pages;
  const cur = dict.common.currency;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-3 text-2xl font-bold text-ink">{t.shippingTitle}</h1>
      <p className="text-sm text-muted">{t.shippingIntro}</p>
      <p className="mt-1 text-sm text-muted">{interpolate(t.deliveryDays, { min: settings.daysMin, max: settings.daysMax })}</p>
      {settings.freeThreshold > 0 && (
        <p className="mt-3 rounded-xl bg-blush-light px-4 py-2 text-sm font-medium text-ink">
          {interpolate(t.freeOver, { amount: `${formatPrice(settings.freeThreshold)} ${cur}` })}
        </p>
      )}
      <div className="mt-5 overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-cream text-xs text-muted">
            <tr>
              <th className="p-3 text-start font-medium">{t.wilaya}</th>
              <th className="p-3 text-end font-medium">{t.home}</th>
              <th className="p-3 text-end font-medium">{t.stopdesk}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {fees.map((f) => (
              <tr key={f.wilaya_code}>
                <td className="p-3 text-ink">
                  {f.wilaya_code} · {lang === "ar" ? f.name_ar : (f.name_fr ?? f.name_ar)}
                </td>
                <td className="p-3 text-end text-ink">
                  {f.home_enabled === false ? t.notAvailable : `${formatPrice(f.home_fee)} ${cur}`}
                </td>
                <td className="p-3 text-end text-ink">
                  {f.stopdesk_enabled === false ? t.notAvailable : `${formatPrice(f.stopdesk_fee)} ${cur}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
