import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export type PublicPage = {
  slug: string;
  title_ar: string;
  title_fr: string | null;
  title_en: string | null;
  body_ar: string | null;
  body_fr: string | null;
  body_en: string | null;
  seo: Record<string, { title?: string; description?: string }>;
  updated_at: string;
};

/** Published pages for the footer (RLS: anon only sees published rows). */
export const getFooterPages = unstable_cache(
  async () => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("pages")
      .select("slug, title_ar, title_fr, title_en")
      .eq("show_in_footer", true)
      .order("position", { ascending: true });
    // Table may not exist yet if migrations haven't been applied.
    if (error) return [];
    return (data as Pick<PublicPage, "slug" | "title_ar" | "title_fr" | "title_en">[] | null) ?? [];
  },
  ["footer-pages-v1"],
  { revalidate: 300, tags: ["content"] },
);

export const getPublishedPage = unstable_cache(
  async (slug: string): Promise<PublicPage | null> => {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("pages")
      .select("slug, title_ar, title_fr, title_en, body_ar, body_fr, body_en, seo, updated_at")
      .eq("slug", slug)
      .maybeSingle();
    return (data as PublicPage | null) ?? null;
  },
  ["published-page-v1"],
  { revalidate: 300, tags: ["content"] },
);

export const getPublishedPageSlugs = unstable_cache(
  async () => {
    const supabase = createPublicClient();
    const { data } = await supabase.from("pages").select("slug, updated_at");
    return (data as { slug: string; updated_at: string }[] | null) ?? [];
  },
  ["published-page-slugs-v1"],
  { revalidate: 600, tags: ["content"] },
);
