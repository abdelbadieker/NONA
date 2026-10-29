"use client";

import { useEffect } from "react";

const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "ttclid", "gclid"];

/**
 * Remembers campaign parameters from the landing URL for this browser
 * session, so the order can be attributed to the ad/campaign that brought
 * the visitor. Stored in sessionStorage only; sent with the order.
 */
export function UtmCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const found = Object.fromEntries(
        KEYS.filter((k) => params.get(k)).map((k) => [k, params.get(k)!.slice(0, 200)]),
      );
      if (Object.keys(found).length) sessionStorage.setItem("nona_utm", JSON.stringify(found));
    } catch {
      // storage unavailable — attribution is best-effort
    }
  }, []);
  return null;
}
