import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, PackageSearch } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { checkoutText } from "@/i18n/checkout";
import { storeText } from "@/i18n/store";
import { PurchaseTracker } from "@/components/marketing/Trackers";

export const metadata: Metadata = { robots: { index: false } };

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ order?: string; t?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const { order, t: token } = await searchParams;
  const t = checkoutText[lang];
  const st = storeText[lang];
  const orderNumber = /^\d{1,10}$/.test(order ?? "") ? order : null;
  const safeToken = /^[0-9a-f-]{36}$/i.test(token ?? "") ? token : null;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <PurchaseTracker />
      <CheckCircle2 className="size-16 text-green-500" aria-hidden />
      <h1 className="text-2xl font-bold text-ink">{t.successTitle}</h1>
      <p className="text-muted">{t.successText}</p>

      {orderNumber && (
        <div className="rounded-xl bg-cream px-6 py-3">
          <span className="text-sm text-muted">{t.orderNumber}</span>
          <p className="text-xl font-bold text-ink" dir="ltr">
            #{orderNumber}
          </p>
        </div>
      )}

      <p className="text-sm text-muted">{t.successNote}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {safeToken && (
          <Link
            href={`/${lang}/track?t=${safeToken}`}
            className="flex items-center gap-1.5 rounded-full border border-ink px-5 py-3 text-sm font-semibold text-ink"
          >
            <PackageSearch className="size-4" aria-hidden />
            {st.checkout.trackLink}
          </Link>
        )}
        <Link href={`/${lang}/shop`} className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white">
          {t.continue}
        </Link>
      </div>
    </div>
  );
}
