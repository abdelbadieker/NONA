import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL as base } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select("slug, updated_at")
    .eq("is_active", true);
  const products =
    (data as { slug: string; updated_at: string }[] | null) ?? [];

  const entries: MetadataRoute.Sitemap = [];
  for (const lang of locales) {
    entries.push({
      url: `${base}/${lang}`,
      changeFrequency: "daily",
      priority: 1,
    });
    entries.push({
      url: `${base}/${lang}/shop`,
      changeFrequency: "daily",
      priority: 0.8,
    });
    for (const p of products) {
      entries.push({
        url: `${base}/${lang}/product/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }
  return entries;
}
