"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BadgePercent,
  Boxes,
  FileText,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  ListX,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  PhoneMissed,
  PlugZap,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { AdminText } from "@/i18n/admin";
import type { AdminOpsText } from "@/i18n/admin-ops";
import type { AdminBuilderText } from "@/i18n/admin-builder";
import { can, type Permission } from "@/lib/permissions";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; perm: Permission; exact?: boolean };
type NavGroup = { label: string; items: NavItem[] };

function buildNav(
  base: string,
  nav: AdminText["nav"],
  ops: AdminOpsText["nav"],
  live: AdminOpsText["live"],
  builder: AdminBuilderText["nav"],
): NavGroup[] {
  return [
    {
      label: ops.groups.sales,
      items: [
        { href: base, label: nav.dashboard, icon: LayoutDashboard, perm: "dashboard.view", exact: true },
        { href: `${base}/orders`, label: nav.orders, icon: ShoppingBag, perm: "orders.view" },
        { href: `${base}/leads`, label: live.navLeads, icon: PhoneMissed, perm: "orders.view" },
      ],
    },
    {
      label: ops.groups.catalog,
      items: [
        { href: `${base}/products`, label: nav.products, icon: Package, perm: "products.view" },
        { href: `${base}/inventory`, label: ops.inventory, icon: Boxes, perm: "inventory.view" },
        { href: `${base}/reviews`, label: live.navReviews, icon: Star, perm: "products.manage" },
      ],
    },
    {
      label: ops.groups.customers,
      items: [
        { href: `${base}/customers`, label: ops.customers, icon: Users, perm: "customers.view" },
        { href: `${base}/forms`, label: ops.forms, icon: Inbox, perm: "forms.view" },
      ],
    },
    {
      label: ops.groups.marketing,
      items: [
        { href: `${base}/landing`, label: builder.landing, icon: Megaphone, perm: "content.manage" },
        { href: `${base}/builder`, label: builder.builder, icon: LayoutTemplate, perm: "content.manage" },
        { href: `${base}/discounts`, label: ops.discounts, icon: BadgePercent, perm: "discounts.manage" },
        { href: `${base}/content`, label: ops.content, icon: FileText, perm: "content.manage" },
        { href: `${base}/appearance`, label: nav.appearance, icon: Palette, perm: "content.manage" },
      ],
    },
    {
      label: ops.groups.system,
      items: [
        { href: `${base}/settings`, label: nav.settings, icon: Settings, perm: "settings.manage" },
        { href: `${base}/reasons`, label: nav.reasons, icon: ListX, perm: "settings.manage" },
        { href: `${base}/integrations`, label: ops.integrations, icon: PlugZap, perm: "settings.manage" },
        { href: `${base}/staff`, label: ops.staff, icon: ShieldCheck, perm: "staff.manage" },
        { href: `${base}/audit`, label: ops.audit, icon: Activity, perm: "audit.view" },
      ],
    },
  ];
}

function NavLinks({
  groups,
  pathname,
  collapsed,
  onNavigate,
}: {
  groups: NavGroup[];
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const isActive = (it: NavItem) => (it.exact ? pathname === it.href : pathname.startsWith(it.href));
  return (
    <nav className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g.label}>
          {!collapsed && (
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted">{g.label}</p>
          )}
          <ul className="flex flex-col gap-0.5">
            {g.items.map((it) => {
              const Icon = it.icon;
              const active = isActive(it);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={onNavigate}
                    title={collapsed ? it.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active ? "bg-blush-light text-blush-dark" : "text-ink hover:bg-cream",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden />
                    {!collapsed && <span className="truncate">{it.label}</span>}
                    {collapsed && <span className="sr-only">{it.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({
  lang,
  nav,
  adminName,
  roleLabel,
  collapsed,
}: {
  lang: Locale;
  nav: AdminText["nav"];
  adminName: string;
  roleLabel: string;
  collapsed?: boolean;
}) {
  return (
    <div className="mt-auto space-y-1 border-t border-line pt-3">
      <Link
        href={`/${lang}`}
        title={collapsed ? nav.viewStore : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-cream",
          collapsed && "justify-center px-0",
        )}
      >
        <Store className="size-5" aria-hidden />
        {!collapsed && nav.viewStore}
      </Link>
      <form action={signOut.bind(null, lang)}>
        <button
          type="submit"
          title={collapsed ? nav.logout : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50",
            collapsed && "justify-center px-0",
          )}
        >
          <LogOut className="size-5" aria-hidden />
          {!collapsed && nav.logout}
        </button>
      </form>
      {!collapsed && adminName && (
        <p className="px-3 pt-1 text-xs text-muted">
          {adminName}
          {roleLabel && <span className="block text-[11px]">{roleLabel}</span>}
        </p>
      )}
    </div>
  );
}

export function AdminShell({
  lang,
  nav,
  ops,
  live,
  builder,
  adminName,
  roleLabel,
  permissions,
  children,
}: {
  lang: Locale;
  nav: AdminText["nav"];
  ops: AdminOpsText["nav"];
  live: AdminOpsText["live"];
  builder: AdminBuilderText["nav"];
  adminName: string;
  roleLabel: string;
  permissions: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const base = `/${lang}/admin`;

  const groups = buildNav(base, nav, ops, live, builder)
    .map((g) => ({ ...g, items: g.items.filter((it) => can(permissions, it.perm)) }))
    .filter((g) => g.items.length);

  const brand = (
    <Link href={base} className="flex items-center gap-1 px-2 text-xl font-bold text-ink">
      NONA
      <span className="mb-1.5 size-1.5 rounded-full bg-gold" aria-hidden />
      {!collapsed && <span className="ms-1 text-xs font-normal text-muted">admin</span>}
    </Link>
  );

  return (
    <div className="min-h-screen bg-cream lg:flex">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 overflow-y-auto border-e border-line bg-white transition-[width] lg:block",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className="flex h-full flex-col p-3">
          <div className={cn("mb-5 flex items-center", collapsed ? "justify-center" : "justify-between")}>
            {!collapsed && brand}
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? ops.expand : ops.collapse}
              aria-expanded={!collapsed}
              className="grid size-8 place-items-center rounded-lg text-muted hover:bg-cream"
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4 rtl:rotate-180" aria-hidden />
              ) : (
                <PanelLeftClose className="size-4 rtl:rotate-180" aria-hidden />
              )}
            </button>
          </div>
          <NavLinks groups={groups} pathname={pathname} collapsed={collapsed} />
          <SidebarFooter lang={lang} nav={nav} adminName={adminName} roleLabel={roleLabel} collapsed={collapsed} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={ops.menu}
          aria-expanded={open}
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
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 flex w-72 flex-col overflow-y-auto bg-white p-3 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              {brand}
              <button
                type="button"
                autoFocus
                onClick={() => setOpen(false)}
                aria-label={ops.close}
                className="grid size-8 place-items-center rounded-lg hover:bg-cream"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <NavLinks groups={groups} pathname={pathname} onNavigate={() => setOpen(false)} />
            <SidebarFooter lang={lang} nav={nav} adminName={adminName} roleLabel={roleLabel} />
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
