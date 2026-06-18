"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, Search, Store } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ar";
import { cn } from "@/lib/utils";

export function BottomNav({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const pathname = usePathname();
  const base = `/${lang}`;

  const items = [
    { href: base, label: dict.nav.home, icon: Home, exact: true },
    { href: `${base}/shop`, label: dict.nav.shop, icon: Store, exact: false },
    { href: `${base}/search`, label: dict.nav.search, icon: Search, exact: false },
    { href: `${base}/wishlist`, label: dict.nav.wishlist, icon: Heart, exact: false },
  ];

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      aria-label={dict.nav.home}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {items.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-blush-dark" : "text-muted hover:text-ink",
                )}
              >
                <Icon
                  className={cn("size-5", active && "fill-blush/40")}
                  aria-hidden
                />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
