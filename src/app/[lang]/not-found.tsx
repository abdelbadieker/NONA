"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { defaultLocale, isLocale } from "@/i18n/config";
import { ar } from "@/i18n/dictionaries/ar";
import { fr } from "@/i18n/dictionaries/fr";
import { en } from "@/i18n/dictionaries/en";

const dicts = { ar, fr, en } as const;

export default function NotFound() {
  const pathname = usePathname();
  const seg = (pathname || "/").split("/")[1];
  const locale = isLocale(seg) ? seg : defaultLocale;
  const dict = dicts[locale];

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <p className="text-7xl font-bold text-blush">404</p>
      <h1 className="text-2xl font-bold text-ink">{dict.common.notFoundTitle}</h1>
      <p className="text-muted">{dict.common.notFoundText}</p>
      <Link
        href={`/${locale}`}
        className="mt-2 rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
      >
        {dict.common.backToHome}
      </Link>
    </div>
  );
}
