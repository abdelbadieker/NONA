// Client-side pixel event helpers (Meta + TikTok). No-ops if pixels absent.

type Fbq = (...args: unknown[]) => void;
type Ttq = {
  track?: (event: string, data?: Record<string, unknown>) => void;
  page?: () => void;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    ttq?: Ttq;
  }
}

export function genEventId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function trackViewContent(p: {
  id: string;
  value: number;
  currency: string;
}) {
  window.fbq?.("track", "ViewContent", {
    content_ids: [p.id],
    content_type: "product",
    value: p.value,
    currency: p.currency,
  });
  window.ttq?.track?.("ViewContent", {
    value: p.value,
    currency: p.currency,
    content_id: p.id,
  });
}

export function trackAddToWishlist(id: string) {
  window.fbq?.("track", "AddToWishlist", {
    content_ids: [id],
    content_type: "product",
  });
  window.ttq?.track?.("AddToWishlist", { content_id: id });
}

export function trackInitiateCheckout(p: {
  ids: string[];
  value: number;
  currency: string;
  numItems: number;
}) {
  window.fbq?.("track", "InitiateCheckout", {
    content_ids: p.ids,
    content_type: "product",
    value: p.value,
    currency: p.currency,
    num_items: p.numItems,
  });
  window.ttq?.track?.("InitiateCheckout", {
    value: p.value,
    currency: p.currency,
    content_id: p.ids[0],
  });
}

export function trackSearch(query: string) {
  window.fbq?.("track", "Search", { search_string: query });
  window.ttq?.track?.("Search", { query });
}

export function trackPurchase(p: {
  ids: string[];
  value: number;
  currency: string;
  numItems: number;
  eventId: string;
}) {
  window.fbq?.(
    "track",
    "Purchase",
    {
      content_ids: p.ids,
      content_type: "product",
      value: p.value,
      currency: p.currency,
      num_items: p.numItems,
    },
    { eventID: p.eventId },
  );
  window.ttq?.track?.("CompletePayment", {
    value: p.value,
    currency: p.currency,
    content_id: p.ids[0],
  });
}
