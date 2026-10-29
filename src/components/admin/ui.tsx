// Server-safe admin UI primitives (no hooks) shared by every admin screen.
import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox, Lock } from "lucide-react";
import type { AdminOpsText } from "@/i18n/admin-ops";
import { cn, interpolate } from "@/lib/utils";

export const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-blush-dark focus-visible:ring-2 focus-visible:ring-blush disabled:bg-cream";
export const labelCls = "mb-1 block text-sm font-medium text-ink";
export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50";
export const btnSecondary =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-cream disabled:opacity-50";
export const btnDanger =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50";

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="space-y-1">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1 text-sm text-muted hover:text-blush-dark">
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({
  title,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-line bg-white", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
      <Inbox className="size-8 text-blush-dark" aria-hidden />
      <p className="text-sm text-muted">{text}</p>
      {action}
    </div>
  );
}

export function NoAccess({ t }: { t: AdminOpsText["common"] }) {
  return (
    <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-line bg-white p-10 text-center">
      <Lock className="size-8 text-muted" aria-hidden />
      <p className="font-semibold text-ink">{t.noAccess}</p>
      <p className="text-sm text-muted">{t.noAccessHint}</p>
    </div>
  );
}

const tones = {
  neutral: "bg-cream text-ink",
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-800",
  blue: "bg-blue-100 text-blue-800",
  purple: "bg-purple-100 text-purple-800",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: React.ReactNode }) {
  return (
    <span className={cn("inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  tone?: "warn";
}) {
  const body = (
    <>
      <p className="text-xs text-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold text-ink", tone === "warn" && "text-amber-700")}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </>
  );
  const cls = "block rounded-2xl border border-line bg-white p-4";
  return href ? (
    <Link href={href} className={cn(cls, "hover:border-blush-dark")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Pagination({
  page,
  pages,
  total,
  hrefFor,
  t,
}: {
  page: number;
  pages: number;
  total: number;
  hrefFor: (page: number) => string;
  t: AdminOpsText["common"];
}) {
  if (pages <= 1) {
    return <p className="px-1 text-xs text-muted">{interpolate(t.results, { count: total })}</p>;
  }
  const linkCls = "inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1.5 text-sm hover:bg-cream";
  return (
    <nav className="flex items-center justify-between gap-3 px-1" aria-label="pagination">
      <p className="text-xs text-muted">
        {interpolate(t.results, { count: total })} · {interpolate(t.page, { page, pages })}
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={hrefFor(page - 1)} className={linkCls} rel="prev">
            <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
            {t.prev}
          </Link>
        )}
        {page < pages && (
          <Link href={hrefFor(page + 1)} className={linkCls} rel="next">
            {t.next}
            <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
          </Link>
        )}
      </div>
    </nav>
  );
}

/** Builds a URL for a list page, keeping current filters and dropping empties. */
export function buildHref(base: string, params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const q = sp.toString();
  return q ? `${base}?${q}` : base;
}

export const fmtDate = (iso: string | null | undefined, withTime = false) =>
  iso
    ? new Intl.DateTimeFormat("fr-DZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
      }).format(new Date(iso))
    : "—";

export const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);
