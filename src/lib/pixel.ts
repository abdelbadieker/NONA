// Client-side pixel event helpers (Meta, TikTok, GA4). No-ops when a pixel
// isn't loaded. Event names follow each provider's standard e-commerce events.

type Fbq = (...args: unknown[]) => void;
type Ttq = {
  track?: (event: string, data?: Record<string, unknown>) => void;
  page?: () => void;
};
type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    ttq?: Ttq;
    gtag?: Gtag;
  }
}

export function genEventId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function trackViewContent(p: { id: string; value: number; currency: string }) {
  window.fbq?.("track", "ViewContent", {
    content_ids: [p.id],
    content_type: "product",
    value: p.value,
    currency: p.currency,
  });
  window.ttq?.track?.("ViewContent", { value: p.value, currency: p.currency, content_id: p.id });
  window.gtag?.("event", "view_item", {
    currency: p.currency,
    value: p.value,
    items: [{ item_id: p.id }],
  });
}

export function trackAddToCart(p: { id: string; value: number; currency: string; qty: number }) {
  window.fbq?.("track", "AddToCart", {
    content_ids: [p.id],
    content_type: "product",
    value: p.value,
    currency: p.currency,
  });
  window.ttq?.track?.("AddToCart", { value: p.value, currency: p.currency, content_id: p.id, quantity: p.qty });
  window.gtag?.("event", "add_to_cart", {
    currency: p.currency,
    value: p.value,
    items: [{ item_id: p.id, quantity: p.qty }],
  });
}

export function trackAddToWishlist(id: string) {
  window.fbq?.("track", "AddToWishlist", { content_ids: [id], content_type: "product" });
  window.ttq?.track?.("AddToWishlist", { content_id: id });
  window.gtag?.("event", "add_to_wishlist", { items: [{ item_id: id }] });
}

export function trackInitiateCheckout(p: { ids: string[]; value: number; currency: string; numItems: number }) {
  window.fbq?.("track", "InitiateCheckout", {
    content_ids: p.ids,
    content_type: "product",
    value: p.value,
    currency: p.currency,
    num_items: p.numItems,
  });
  window.ttq?.track?.("InitiateCheckout", { value: p.value, currency: p.currency, content_id: p.ids[0] });
  window.gtag?.("event", "begin_checkout", {
    currency: p.currency,
    value: p.value,
    items: p.ids.map((id) => ({ item_id: id })),
  });
}

export function trackSearch(query: string) {
  window.fbq?.("track", "Search", { search_string: query });
  window.ttq?.track?.("Search", { query });
  window.gtag?.("event", "search", { search_term: query });
}

/** Purchase — `eventId` is shared with the server-side Conversions API for dedup. */
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
    event_id: p.eventId,
  });
  window.gtag?.("event", "purchase", {
    transaction_id: p.eventId,
    currency: p.currency,
    value: p.value,
    items: p.ids.map((id) => ({ item_id: id })),
  });
}
