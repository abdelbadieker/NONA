"use client";

import Script from "next/script";

/** Google Analytics 4 (gtag.js). `measurementId` is validated server-side (G-XXXX). */
export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  if (!measurementId) return null;
  const id = JSON.stringify(measurementId);
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
        gtag('js',new Date());gtag('config',${id});`}
      </Script>
    </>
  );
}
