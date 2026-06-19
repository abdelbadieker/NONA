import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { checkoutText } from "@/i18n/checkout";

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const { order } = await searchParams;
  const t = checkoutText[lang];

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <CheckCircle2 className="size-16 text-green-500" aria-hidden />
      <h1 className="text-2xl font-bold text-ink">{t.successTitle}</h1>
      <p className="text-muted">{t.successText}</p>

      {order && (
        <div className="rounded-xl bg-cream px-6 py-3">
          <span className="text-sm text-muted">{t.orderNumber}</span>
          <p className="text-xl font-bold text-ink">#{order}</p>
        </div>
      )}

      <p className="text-sm text-muted">{t.successNote}</p>
      <Link
        href={`/${lang}/shop`}
        className="mt-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white"
      >
        {t.continue}
      </Link>
    </div>
  );
}
