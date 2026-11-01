"use client";

import { useEffect } from "react";

const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "ttclid", "gclid"];

/**
 * Remembers how the visitor arrived (campaign tags, click ids, external
 * referrer, landing page) for this browser session, so the order — or the
 * abandoned-checkout lead — can be attributed. sessionStorage only.
 */
export function UtmCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tags = Object.fromEntries(
        KEYS.filter((k) => params.get(k)).map((k) => [k, params.get(k)!.slice(0, 300)]),
      );
      let external = "";
      try {
        external =
          document.referrer && new URL(document.referrer).host !== window.location.host ? document.referrer : "";
      } catch {}
      const existing = sessionStorage.getItem("nona_utm");
      // New campaign tags always win; otherwise keep the session's first touch.
      if (Object.keys(tags).length || (!existing && external)) {
        sessionStorage.setItem(
          "nona_utm",
          JSON.stringify({
            ...tags,
            ...(external ? { referrer: external.slice(0, 300) } : {}),
            landing: window.location.pathname.slice(0, 300),
          }),
        );
      }
    } catch {
      // storage unavailable — attribution is best-effort
    }
  }, []);
  return null;
}
