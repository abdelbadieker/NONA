import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { createPublicClient } from "@/lib/supabase/public";
import { getPublishedPageSlugs } from "@/lib/data/content";
import { SITE_URL as base } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Anon client: RLS guarantees only active products / published pages.
  const supabase = createPublicClient();
  const { data } = await supabase.from("products").select("slug, updated_at").eq("is_active", true);
  const products = (data as { slug: string; updated_at: string }[] | null) ?? [];
  const pages = await getPublishedPageSlugs();

  const alternates = (path: string) => ({
    languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}${path}`])),
  });

  const entries: MetadataRoute.Sitemap = [];
  for (const lang of locales) {
    for (const [path, priority] of [
      ["", 1],
      ["/shop", 0.8],
      ["/faq", 0.4],
      ["/shipping", 0.4],
      ["/contact", 0.3],
    ] as const) {
      entries.push({
        url: `${base}/${lang}${path}`,
        changeFrequency: path ? "weekly" : "daily",
        priority,
        alternates: alternates(path),
      });
    }
    for (const p of products) {
      entries.push({
        url: `${base}/${lang}/product/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: alternates(`/product/${p.slug}`),
      });
    }
    for (const p of pages) {
      entries.push({
        url: `${base}/${lang}/pages/${p.slug}`,
        lastModified: new Date(p.updated_at),
        changeFrequency: "monthly",
        priority: 0.3,
      });
    }
  }
  return entries;
}
