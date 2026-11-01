"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function sessionId(): string {
  try {
    let id = sessionStorage.getItem("nona_sid");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("nona_sid", id);
    }
    return id;
  } catch {
    return "nostorage-session";
  }
}

/** Sends one first-party page-view beacon per storefront route change. */
export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    const payload = JSON.stringify({ path: pathname, sessionId: sessionId(), referrer: document.referrer || undefined });
    try {
      if (!navigator.sendBeacon?.("/api/track", new Blob([payload], { type: "application/json" }))) {
        fetch("/api/track", { method: "POST", body: payload, keepalive: true }).catch(() => {});
      }
    } catch {}
  }, [pathname]);
  return null;
}
