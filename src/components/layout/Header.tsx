import Link from "next/link";
import { Heart, Search } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ar";
import type { StoreText } from "@/i18n/store";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CartLink } from "./CartLink";

export function Header({ lang, dict, st }: { lang: Locale; dict: Dictionary; st: StoreText }) {
  const base = `/${lang}`;
  const navCls = "text-sm font-medium text-ink transition-colors hover:text-blush-dark";
  const iconCls =
    "grid size-9 place-items-center rounded-full text-ink transition-colors hover:bg-blush-light";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-1 focus:text-sm focus:text-white"
      >
        {dict.header.skipToContent}
      </a>

      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={base} aria-label="NONA" className="flex items-center gap-1 text-2xl font-bold tracking-tight text-ink">
          NONA
          <span className="mb-2 size-1.5 rounded-full bg-gold" aria-hidden />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label={dict.nav.home}>
          <Link href={base} className={navCls}>
            {dict.nav.home}
          </Link>
          <Link href={`${base}/shop`} className={navCls}>
            {dict.nav.shop}
          </Link>
          <Link href={`${base}/track`} className={navCls}>
            {st.nav.track}
          </Link>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link href={`${base}/search`} aria-label={dict.nav.search} className={iconCls}>
            <Search className="size-5" aria-hidden />
          </Link>
          <Link href={`${base}/wishlist`} aria-label={dict.nav.wishlist} className={`${iconCls} hidden sm:grid`}>
            <Heart className="size-5" aria-hidden />
          </Link>
          <CartLink href={`${base}/cart`} label={st.nav.cart} />
          <LanguageSwitcher locale={lang} label={dict.language.change} />
        </div>
      </div>
    </header>
  );
}
