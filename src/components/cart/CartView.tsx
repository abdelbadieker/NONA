"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { StoreText } from "@/i18n/store";
import { quoteCart, type Quote } from "@/lib/actions/orders";
import { useCart } from "@/lib/cart";
import { cn, formatPrice, interpolate } from "@/lib/utils";

type State = { key: string; quote: Quote | null; error: string | null; variantId?: string; available?: number };

export function CartView({
  lang,
  st,
  currency,
  freeThreshold,
}: {
  lang: Locale;
  st: StoreText;
  currency: string;
  freeThreshold: number;
}) {
  const { items, ready, setQty, remove } = useCart();
  const [state, setState] = useState<State | null>(null);
  const key = useMemo(() => JSON.stringify(items.map((i) => [i.variantId, i.qty])), [items]);

  useEffect(() => {
    if (!ready || !items.length) return;
    let cancelled = false;
    const id = setTimeout(async () => {
      const res = await quoteCart({
        items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
        locale: lang,
      });
      if (cancelled) return;
      setState(
        res.ok
          ? { key, quote: res.quote, error: null }
          : { key, quote: null, error: res.error, variantId: res.variantId, available: res.available },
      );
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [key, ready, items, lang]);

  if (!ready) return <div className="h-64 animate-pulse rounded-2xl bg-cream" aria-busy="true" />;

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <ShoppingBag className="size-12 text-blush" aria-hidden />
        <h2 className="text-xl font-bold text-ink">{st.cart.empty}</h2>
        <p className="text-muted">{st.cart.emptyText}</p>
        <Link href={`/${lang}/shop`} className="rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-white">
          {st.cart.continue}
        </Link>
      </div>
    );
  }

  const loading = state?.key !== key;
  const quote = state?.key === key ? state.quote : null;
  const lineById = new Map((quote?.lines ?? []).map((l) => [l.variantId, l]));
  const subtotal = quote?.subtotal ?? null;
  const remaining = freeThreshold > 0 && subtotal != null ? Math.max(0, freeThreshold - subtotal) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <ul className="divide-y divide-line rounded-2xl border border-line bg-white" aria-busy={loading}>
        {items.map((item) => {
          const line = lineById.get(item.variantId);
          const bad = state?.key === key && state.variantId === item.variantId;
          return (
            <li key={item.variantId} className={cn("flex gap-3 p-4", bad && "bg-red-50")}>
              <Link
                href={line ? `/${lang}/product/${line.slug}` : "#"}
                className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-blush-light"
              >
                {line?.imageUrl && <Image src={line.imageUrl} alt={line.name} fill sizes="80px" className="object-cover" />}
              </Link>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-ink">
                  {line?.name ?? (loading ? "…" : "—")}
                </p>
                {line?.variantLabel && <p className="mt-0.5 text-xs text-muted">{line.variantLabel}</p>}
                {line && <p className="mt-1 text-sm font-semibold text-ink">{formatPrice(line.unitPrice)} {currency}</p>}
                {bad && (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    {state?.error === "out_of_stock" && state.available != null
                      ? interpolate(st.cart.onlyAvailable, { count: state.available })
                      : st.cart.unavailable}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center rounded-lg border border-line">
                    <button
                      type="button"
                      onClick={() => setQty(item.variantId, item.qty - 1)}
                      disabled={item.qty <= 1}
                      aria-label="−"
                      className="grid size-8 place-items-center disabled:opacity-30"
                    >
                      <Minus className="size-3.5" aria-hidden />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(item.variantId, item.qty + 1)}
                      disabled={line ? item.qty >= line.stock : false}
                      aria-label="+"
                      className="grid size-8 place-items-center disabled:opacity-30"
                    >
                      <Plus className="size-3.5" aria-hidden />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item.variantId)}
                    className="flex items-center gap-1 text-xs text-muted hover:text-red-600"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    {st.cart.remove}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="h-fit rounded-2xl border border-line bg-cream p-5 lg:sticky lg:top-20">
        {remaining != null && (
          <div className="mb-4">
            <p className="text-sm text-ink">
              {remaining > 0
                ? interpolate(st.cart.freeShippingProgress, { amount: `${formatPrice(remaining)} ${currency}` })
                : st.cart.freeShippingReached}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-blush-dark transition-all"
                style={{ width: `${Math.min(100, ((subtotal ?? 0) / freeThreshold) * 100)}%` }}
              />
            </div>
          </div>
        )}
        <div className="flex justify-between text-base">
          <span className="font-semibold text-ink">{st.cart.subtotal}</span>
          <span className={cn("font-bold text-ink", loading && "opacity-50")}>
            {subtotal != null ? `${formatPrice(subtotal)} ${currency}` : "—"}
          </span>
        </div>
        {quote && quote.discountAmount > 0 && quote.discount && (
          <p className="mt-1 text-xs text-green-700">
            {quote.discount.title}: −{formatPrice(quote.discountAmount)} {currency}
          </p>
        )}
        <p className="mt-2 text-xs text-muted">{st.cart.estimateNote}</p>
        {state?.key === key && state.error && !state.variantId && (
          <p className="mt-2 text-xs text-red-600">{st.cart.loadError}</p>
        )}
        <Link
          href={`/${lang}/checkout`}
          aria-disabled={!quote}
          className={cn(
            "mt-4 block rounded-full bg-ink px-6 py-3.5 text-center text-base font-semibold text-white",
            !quote && "pointer-events-none opacity-50",
          )}
        >
          {st.cart.checkout}
        </Link>
        <Link href={`/${lang}/shop`} className="mt-3 block text-center text-sm text-muted hover:text-ink">
          {st.cart.continue}
        </Link>
      </aside>
    </div>
  );
}
