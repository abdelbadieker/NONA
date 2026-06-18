import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Category } from "@/lib/types";
import { pickLocale } from "@/lib/utils";

export function CategoryGrid({
  categories,
  lang,
}: {
  categories: Category[];
  lang: Locale;
}) {
  if (!categories.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {categories.map((c) => (
        <Link
          key={c.id}
          href={`/${lang}/shop?category=${c.slug}`}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-br from-blush-light to-cream text-center transition-colors hover:from-blush hover:to-blush-light"
        >
          <span className="px-2 text-sm font-semibold text-ink sm:text-base">
            {pickLocale(c, "name", lang)}
          </span>
        </Link>
      ))}
    </div>
  );
}
