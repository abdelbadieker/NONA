"use client";

import { useEffect } from "react";
import { trackPurchase, trackSearch, trackViewContent } from "@/lib/pixel";

export function ViewContentTracker({
  id,
  value,
  currency = "DZD",
}: {
  id: string;
  value: number;
  currency?: string;
}) {
  useEffect(() => {
    trackViewContent({ id, value, currency });
  }, [id, value, currency]);
  return null;
}

export function SearchTracker({ query }: { query: string }) {
  useEffect(() => {
    if (query) trackSearch(query);
  }, [query]);
  return null;
}

export function PurchaseTracker() {
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("nona_purchase");
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p?.ids?.[0] && typeof p.value === "number" && p.eventId) {
        trackPurchase(p);
      }
      sessionStorage.removeItem("nona_purchase");
    } catch {
      // ignore
    }
  }, []);
  return null;
}
