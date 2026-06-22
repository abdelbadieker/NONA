import Link from "next/link";
import { BadgeCheck, MapPin, Phone, RefreshCw, Truck } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ar";

type IconProps = { className?: string };

const InstagramIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <rect x="2" y="2" width="20" height="20" rx="5.5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);
const FacebookIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.8 3.7-3.8 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" />
  </svg>
);
const TiktokIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M16.5 8.6a5.7 5.7 0 0 0 3.3 1V7.1a3.3 3.3 0 0 1-3.3-3.3h-2.6v11.6a2 2 0 1 1-2-2l.4.04V10.7a4.6 4.6 0 1 0 4.2 4.6V8.6z" />
  </svg>
);

export function Footer({
  lang,
  dict,
  store = {},
  social = {},
}: {
  lang: Locale;
  dict: Dictionary;
  store?: Record<string, string>;
  social?: Record<string, string>;
}) {
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

  const socials = [
    { href: social.instagram, Icon: InstagramIcon },
    { href: social.facebook, Icon: FacebookIcon },
    { href: social.tiktok, Icon: TiktokIcon },
  ].filter((s) => s.href);

  return (
    <footer className="border-t border-line bg-cream">
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
        <div className="col-span-2">
          <div className="flex items-center gap-1 text-2xl font-bold text-ink">
            NONA
            <span className="mb-2 size-1.5 rounded-full bg-gold" aria-hidden />
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted">{dict.footer.tagline}</p>

          {store.address && (
            <p className="mt-4 flex items-start gap-2 text-sm text-ink">
              <MapPin className="mt-0.5 size-4 shrink-0 text-blush-dark" aria-hidden />
              {store.address}
            </p>
          )}
          {store.phone && (
            <a
              href={`tel:${store.phone}`}
              dir="ltr"
              className="mt-1.5 flex items-center gap-2 text-sm text-ink hover:text-blush-dark"
            >
              <Phone className="size-4 shrink-0 text-blush-dark" aria-hidden />
              {store.phone}
            </a>
          )}

          {socials.length > 0 && (
            <div className="mt-4 flex gap-2">
              {socials.map(({ href, Icon }, i) => (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="social"
                  className="grid size-9 place-items-center rounded-full bg-white text-ink shadow-sm transition-colors hover:bg-blush-light hover:text-blush-dark"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          )}
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
