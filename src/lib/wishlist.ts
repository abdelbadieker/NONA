"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createLocalStore, useHydrated } from "@/lib/local-store";

const EMPTY: string[] = [];

const store = createLocalStore<string[]>("nona_wishlist", EMPTY, (raw) =>
  Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").slice(0, 200) : EMPTY,
);

/** Guest wishlist backed by localStorage, synced across components and tabs. */
export function useWishlist() {
  const ids = useSyncExternalStore(store.subscribe, store.get, store.getServerSnapshot);
  const ready = useHydrated();

  const toggle = useCallback((id: string) => {
    const cur = store.get();
    store.set(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, has, toggle, count: ids.length, ready };
}
