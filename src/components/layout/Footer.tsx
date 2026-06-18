import Link from "next/link";
import { BadgeCheck, RefreshCw, Truck } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ar";

export function Footer({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const base = `/${lang}`;
  const year = new Date().getFullYear();

  const trust = [
    { icon: Truck, label: dict.footer.delivery },
    { icon: BadgeCheck, label: dict.footer.cod },
    { icon: RefreshCw, label: dict.footer.exchange },
  ];

  const shopLinks = [
    { href: base, label: dict.nav.home },
    { href: `${base}/shop`, label: dict.nav.shop },
    { href: `${base}/wishlist`, label: dict.nav.wishlist },
  ];

  const helpLinks = [
    { href: `${base}/faq`, label: dict.footer.faq },
    { href: `${base}/shipping`, label: dict.footer.shipping },
    { href: `${base}/returns`, label: dict.footer.returns },
    { href: `${base}/contact`, label: dict.footer.contact },
  ];

  return (
    <footer className="border-t border-line bg-cream">
      {/* Trust badges */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 border-b border-line px-4 py-6 sm:grid-cols-3 sm:px-6">
        {trust.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center justify-center gap-2 text-sm font-medium text-ink"
          >
            <Icon className="size-5 text-blush-dark" aria-hidden />
            {label}
          </div>
        ))}
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-4 sm:px-6">
        <div className="col-span-2 sm:col-span-2">
          <div className="flex items-center gap-1 text-2xl font-bold text-ink">
            NONA
            <span className="mb-2 size-1.5 rounded-full bg-gold" aria-hidden />
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted">{dict.footer.tagline}</p>
        </div>

        <nav aria-label={dict.footer.shopTitle}>
          <h2 className="text-sm font-semibold text-ink">{dict.footer.shopTitle}</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {shopLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-blush-dark">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={dict.footer.helpTitle}>
          <h2 className="text-sm font-semibold text-ink">{dict.footer.helpTitle}</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {helpLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-blush-dark">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted sm:flex-row sm:px-6">
          <p>
            © {year} NONA — {dict.footer.rights}
          </p>
          <p>{dict.footer.madeIn} 🇩🇿</p>
        </div>
      </div>
    </footer>
  );
}
