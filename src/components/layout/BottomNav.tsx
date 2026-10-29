"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, Search, ShoppingBag, Store } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ar";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

export function BottomNav({ lang, dict, cartLabel }: { lang: Locale; dict: Dictionary; cartLabel: string }) {
  const pathname = usePathname();
  const { count } = useCart();
  const base = `/${lang}`;

  const items = [
    { href: base, label: dict.nav.home, icon: Home, exact: true },
    { href: `${base}/shop`, label: dict.nav.shop, icon: Store, exact: false },
    { href: `${base}/search`, label: dict.nav.search, icon: Search, exact: false },
    { href: `${base}/wishlist`, label: dict.nav.wishlist, icon: Heart, exact: false },
    { href: `${base}/cart`, label: cartLabel, icon: ShoppingBag, exact: false, badge: count },
  ];

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      aria-label={dict.nav.home}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-blush-dark" : "text-muted hover:text-ink",
                )}
              >
                <Icon className={cn("size-5", active && "fill-blush/40")} aria-hidden />
                {!!item.badge && (
                  <span className="absolute top-1.5 start-1/2 ms-1.5 grid min-w-4 place-items-center rounded-full bg-blush-dark px-1 text-[10px] font-bold leading-4 text-white">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
