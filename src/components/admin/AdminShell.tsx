"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListX,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Store,
  X,
} from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { AdminText } from "@/i18n/admin";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export function AdminShell({
  lang,
  nav,
  adminName,
  children,
}: {
  lang: Locale;
  nav: AdminText["nav"];
  adminName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const base = `/${lang}/admin`;

  const items = [
    { href: base, label: nav.dashboard, icon: LayoutDashboard, exact: true },
    { href: `${base}/orders`, label: nav.orders, icon: ShoppingBag },
    { href: `${base}/products`, label: nav.products, icon: Package },
    { href: `${base}/reasons`, label: nav.reasons, icon: ListX },
    { href: `${base}/settings`, label: nav.settings, icon: Settings },
  ];
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex flex-col gap-1">
      {items.map((it) => {
        const Icon = it.icon;
        const active = isActive(it.href, it.exact);
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-blush-light text-blush-dark"
                : "text-ink hover:bg-cream",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );

  const Aside = ({ onNavClick }: { onNavClick?: () => void }) => (
    <div className="flex h-full flex-col p-4">
      <Link
        href={base}
        onClick={onNavClick}
        className="mb-6 flex items-center gap-1 px-2 text-xl font-bold text-ink"
      >
        NONA
        <span className="mb-1.5 size-1.5 rounded-full bg-gold" aria-hidden />
        <span className="ms-1 text-xs font-normal text-muted">admin</span>
      </Link>
      <NavLinks onClick={onNavClick} />
      <div className="mt-auto space-y-1 border-t border-line pt-3">
        <Link
          href={`/${lang}`}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-cream"
        >
          <Store className="size-5" aria-hidden />
          {nav.viewStore}
        </Link>
        <form action={signOut.bind(null, lang)}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut className="size-5" aria-hidden />
            {nav.logout}
          </button>
        </form>
        {adminName && (
          <p className="px-3 pt-1 text-xs text-muted">{adminName}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-e border-line bg-white lg:block">
        <Aside />
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="menu"
          className="grid size-9 place-items-center rounded-lg hover:bg-cream"
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <span className="flex items-center gap-1 font-bold text-ink">
          NONA
          <span className="mb-1.5 size-1.5 rounded-full bg-gold" aria-hidden />
        </span>
        <div className="size-9" />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 start-0 w-64 bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="close"
              className="absolute end-3 top-3 grid size-8 place-items-center rounded-lg hover:bg-cream"
            >
              <X className="size-5" aria-hidden />
            </button>
            <Aside onNavClick={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
