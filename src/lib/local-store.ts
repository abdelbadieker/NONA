"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny localStorage-backed store for useSyncExternalStore: one source of
 * truth per key, synced across components and tabs, SSR-safe (the server
 * snapshot is the fallback), and tolerant of corrupted/blocked storage.
 */
export function createLocalStore<T>(key: string, fallback: T, parse: (raw: unknown) => T) {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cached: T = fallback;

  function read(): T {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return cached;
    }
    if (raw === cachedRaw) return cached;
    cachedRaw = raw;
    try {
      cached = raw ? parse(JSON.parse(raw)) : fallback;
    } catch {
      cached = fallback;
    }
    return cached;
  }

  function emit() {
    listeners.forEach((l) => l());
  }

  function onStorage(e: StorageEvent) {
    if (e.key === key) emit();
  }

  return {
    get: read,
    set(next: T) {
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Storage full or blocked (private mode): keep working in memory.
        cachedRaw = undefined;
        cached = next;
      }
      emit();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", onStorage);
      };
    },
    getServerSnapshot: () => fallback,
  };
}

const noopSubscribe = () => () => {};

/** False during SSR and hydration, true once running in the browser. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
