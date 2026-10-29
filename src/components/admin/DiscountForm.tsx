"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { AdminOpsText } from "@/i18n/admin-ops";
import { saveDiscount } from "@/lib/actions/discounts";
import { cn } from "@/lib/utils";
import { ActionMessage, useAdminAction } from "./use-action";
import { btnPrimary, inputCls, labelCls } from "./ui";

type Opt = { id: string; label: string };

/** ISO (UTC) → value for <input type="datetime-local"> in the admin's own timezone. */
const toLocalInput = (iso: unknown) => {
  if (typeof iso !== "string" || !iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

export function DiscountForm({
  lang,
  ops,
  initial,
  products,
  categories,
}: {
  lang: Locale;
  ops: AdminOpsText;
  initial: Record<string, unknown> | null;
  products: Opt[];
  categories: Opt[];
}) {
  const router = useRouter();
  const t = ops.discounts;
  const { pending, run, msg } = useAdminAction({ ...ops.errors, ...t.errors }, ops.common.saved);
  const [f, setF] = useState({
    automatic: Boolean(initial?.automatic),
    code: String(initial?.code ?? ""),
    title: String(initial?.title ?? ""),
    kind: (initial?.kind as "percentage" | "fixed" | "free_shipping") ?? "percentage",
    value: initial?.value != null ? String(initial.value) : "",
    minSubtotal: initial?.min_subtotal ? String(initial.min_subtotal) : "",
    minQuantity: initial?.min_quantity ? String(initial.min_quantity) : "",
    appliesTo: (initial?.applies_to as "all" | "products" | "categories") ?? "all",
    productIds: (initial?.product_ids as string[]) ?? [],
    categoryIds: (initial?.category_ids as string[]) ?? [],
    startsAt: toLocalInput(initial?.starts_at),
    endsAt: toLocalInput(initial?.ends_at),
    usageLimit: initial?.usage_limit ? String(initial.usage_limit) : "",
    oncePerCustomer: Boolean(initial?.once_per_customer),
    isActive: initial ? Boolean(initial.is_active) : true,
  });
  const set = (patch: Partial<typeof f>) => setF((p) => ({ ...p, ...patch }));
  const toggleIn = (key: "productIds" | "categoryIds", id: string) =>
    set({ [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id] } as Partial<typeof f>);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run(
      () =>
        saveDiscount(
          {
            id: initial?.id as string | undefined,
            code: f.automatic ? null : f.code,
            title: f.title,
            kind: f.kind,
            value: f.kind === "free_shipping" ? 0 : Number(f.value) || 0,
            min_subtotal: Number(f.minSubtotal) || 0,
            min_quantity: Number(f.minQuantity) || 0,
            applies_to: f.appliesTo,
            product_ids: f.productIds,
            category_ids: f.categoryIds,
            starts_at: fromLocalInput(f.startsAt),
            ends_at: fromLocalInput(f.endsAt),
            usage_limit: f.usageLimit ? Number(f.usageLimit) : null,
            once_per_customer: f.oncePerCustomer,
            automatic: f.automatic,
            is_active: f.isActive,
          },
          lang,
        ),
      () => router.push(`/${lang}/admin/discounts`),
    );
  }

  const picker = (opts: Opt[], key: "productIds" | "categoryIds") => (
    <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
      {opts.map((o) => (
        <label key={o.id} className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={f[key].includes(o.id)} onChange={() => toggleIn(key, o.id)} className="size-4 accent-blush-dark" />
          {o.label}
        </label>
      ))}
    </div>
  );

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5">
      <section className="grid gap-4 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
          <input type="checkbox" checked={f.automatic} onChange={(e) => set({ automatic: e.target.checked })} className="size-4 accent-blush-dark" />
          {t.automatic}
        </label>
        {!f.automatic && (
          <label>
            <span className={labelCls}>{t.code}</span>
            <input value={f.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} dir="ltr" maxLength={32} className={cn(inputCls, "uppercase")} required />
          </label>
        )}
        <label className={f.automatic ? "sm:col-span-2" : undefined}>
          <span className={labelCls}>{t.titleField}</span>
          <input value={f.title} onChange={(e) => set({ title: e.target.value })} maxLength={80} className={inputCls} required />
        </label>
        <label>
          <span className={labelCls}>{t.kind}</span>
          <select value={f.kind} onChange={(e) => set({ kind: e.target.value as typeof f.kind })} className={inputCls}>
            {(["percentage", "fixed", "free_shipping"] as const).map((k) => (
              <option key={k} value={k}>
                {t.kinds[k]}
              </option>
            ))}
          </select>
        </label>
        {f.kind !== "free_shipping" && (
          <label>
            <span className={labelCls}>
              {t.value} {f.kind === "percentage" ? "(%)" : "(DA)"}
            </span>
            <input value={f.value} onChange={(e) => set({ value: e.target.value })} inputMode="decimal" dir="ltr" className={inputCls} required />
          </label>
        )}
      </section>

      <section className="grid gap-4 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2">
        <label>
          <span className={labelCls}>{t.minSubtotal}</span>
          <input value={f.minSubtotal} onChange={(e) => set({ minSubtotal: e.target.value })} inputMode="decimal" dir="ltr" className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>{t.minQuantity}</span>
          <input value={f.minQuantity} onChange={(e) => set({ minQuantity: e.target.value })} inputMode="numeric" dir="ltr" className={inputCls} />
        </label>
        <label className="sm:col-span-2">
          <span className={labelCls}>{t.appliesTo}</span>
          <select value={f.appliesTo} onChange={(e) => set({ appliesTo: e.target.value as typeof f.appliesTo })} className={inputCls}>
            {(["all", "products", "categories"] as const).map((s) => (
              <option key={s} value={s}>
                {t.scopes[s]}
              </option>
            ))}
          </select>
        </label>
        {f.appliesTo === "products" && <div className="sm:col-span-2">{picker(products, "productIds")}</div>}
        {f.appliesTo === "categories" && <div className="sm:col-span-2">{picker(categories, "categoryIds")}</div>}
      </section>

      <section className="grid gap-4 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2">
        <label>
          <span className={labelCls}>{t.startsAt}</span>
          {/* Server and browser timezones can differ for the initial value. */}
          <input type="datetime-local" value={f.startsAt} onChange={(e) => set({ startsAt: e.target.value })} className={inputCls} suppressHydrationWarning />
        </label>
        <label>
          <span className={labelCls}>{t.endsAt}</span>
          <input type="datetime-local" value={f.endsAt} onChange={(e) => set({ endsAt: e.target.value })} className={inputCls} suppressHydrationWarning />
        </label>
        <label>
          <span className={labelCls}>{t.usageLimit}</span>
          <input value={f.usageLimit} onChange={(e) => set({ usageLimit: e.target.value })} inputMode="numeric" dir="ltr" className={inputCls} placeholder="∞" />
        </label>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={f.oncePerCustomer} onChange={(e) => set({ oncePerCustomer: e.target.checked })} className="size-4 accent-blush-dark" />
            {t.oncePerCustomer}
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={f.isActive} onChange={(e) => set({ isActive: e.target.checked })} className="size-4 accent-blush-dark" />
            {ops.common.active}
          </label>
        </div>
      </section>

      <p className="text-xs text-muted">{t.rules}</p>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? ops.common.saving : ops.common.save}
        </button>
        <ActionMessage msg={msg} />
      </div>
    </form>
  );
}
