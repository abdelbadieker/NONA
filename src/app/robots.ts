import type { MetadataRoute } from "next";
import { SITE_URL as base } from "@/lib/site";

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
