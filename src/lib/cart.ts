"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createLocalStore, useHydrated } from "@/lib/local-store";

/**
 * Guest cart: only variant ids + quantities live in the browser. Names,
 * prices, stock and totals always come from the server quote, so a stale or
 * tampered cart can never change what the customer is charged.
 */
export type CartItem = { variantId: string; productId: string; qty: number };

const MAX_LINES = 20;
const MAX_QTY = 99;
const UUID = /^[0-9a-f-]{36}$/i;
const EMPTY: CartItem[] = [];

function sanitize(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return EMPTY;
  const out: CartItem[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const { variantId, productId, qty } = r as Record<string, unknown>;
    if (typeof variantId !== "string" || !UUID.test(variantId)) continue;
    if (typeof productId !== "string" || !UUID.test(productId)) continue;
    const q = Math.min(MAX_QTY, Math.max(1, Math.floor(Number(qty) || 1)));
    out.push({ variantId, productId, qty: q });
  }
  return out.slice(0, MAX_LINES);
}

const store = createLocalStore<CartItem[]>("nona_cart", EMPTY, sanitize);

export const cartStore = {
  add(item: CartItem) {
    const cur = store.get();
    const found = cur.find((i) => i.variantId === item.variantId);
    const next = found
      ? cur.map((i) =>
          i.variantId === item.variantId ? { ...i, qty: Math.min(MAX_QTY, i.qty + item.qty) } : i,
        )
      : [...cur, item].slice(0, MAX_LINES);
    store.set(next);
  },
  setQty(variantId: string, qty: number) {
    const q = Math.min(MAX_QTY, Math.max(0, Math.floor(qty)));
    store.set(
      q === 0
        ? store.get().filter((i) => i.variantId !== variantId)
        : store.get().map((i) => (i.variantId === variantId ? { ...i, qty: q } : i)),
    );
  },
  remove(variantId: string) {
    store.set(store.get().filter((i) => i.variantId !== variantId));
  },
  clear() {
    store.set(EMPTY);
  },
};

export function useCart() {
  const items = useSyncExternalStore(store.subscribe, store.get, store.getServerSnapshot);
  const ready = useHydrated();
  const count = items.reduce((s, i) => s + i.qty, 0);
  const add = useCallback((item: CartItem) => cartStore.add(item), []);
  return { ...cartStore, items, count, ready, add };
}
