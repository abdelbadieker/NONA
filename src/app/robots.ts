import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/ar/admin",
        "/fr/admin",
        "/en/admin",
        "/ar/checkout",
        "/fr/checkout",
        "/en/checkout",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
