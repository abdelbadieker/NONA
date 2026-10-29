import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { storeText } from "@/i18n/store";
import { findOrderByToken } from "@/lib/data/tracking";
import { OrderTrackingView } from "@/components/track/OrderTrackingView";
import { TrackForm } from "@/components/track/TrackForm";

export const metadata: Metadata = { robots: { index: false } };

export default async function TrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { t: token } = await searchParams;
  const [dict] = await Promise.all([getDictionary(lang)]);
  const st = storeText[lang];
  const order = token ? await findOrderByToken(token) : null;

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-ink">{st.track.title}</h1>
      {order ? (
        <OrderTrackingView order={order} t={st.track} currency={dict.common.currency} locale={lang} />
      ) : (
        <TrackForm t={st.track} currency={dict.common.currency} locale={lang} />
      )}
      <p className="mt-6 text-center text-sm text-muted">{st.track.help}</p>
    </div>
  );
}
