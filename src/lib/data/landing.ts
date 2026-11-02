import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { readBlocks, readForm, type LandingBlock, type LandingForm } from "@/lib/landing";
import type { ProductWithRelations } from "@/lib/types";

export type LandingPage = {
  id: string;
  slug: string;
  title: string;
  product_id: string | null;
  locale: "ar" | "fr" | "en";
  status: "draft" | "published";
  blocks: LandingBlock[];
  form: LandingForm;
  seo: { title?: string; description?: string };
};

const PUBLIC_FIELDS = "id, slug, title, product_id, locale, status, blocks, form, seo";

function normalize(row: Record<string, unknown>): LandingPage {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    product_id: (row.product_id as string) ?? null,
    locale: (["ar", "fr", "en"].includes(String(row.locale)) ? row.locale : "ar") as LandingPage["locale"],
    status: row.status === "published" ? "published" : "draft",
    blocks: readBlocks(row.blocks),
    form: readForm(row.form),
    seo: (row.seo as LandingPage["seo"]) ?? {},
  };
}

/** Published page by slug (anon client: RLS + column grants apply). */
export const getPublishedLanding = unstable_cache(
  async (slug: string): Promise<LandingPage | null> => {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;
    const supabase = createPublicClient();
    const { data, error } = await supabase.from("landing_pages").select(PUBLIC_FIELDS).eq("slug", slug).maybeSingle();
    if (error || !data) return null;
    return normalize(data as Record<string, unknown>);
  },
  ["landing-by-slug-v1"],
  { revalidate: 120, tags: ["landing"] },
);

/** Any status, but only with the page's secret preview token. Never cached. */
export async function getLandingPreview(slug: string, token: string): Promise<LandingPage | null> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !/^[0-9a-f-]{36}$/i.test(token)) return null;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("landing_pages")
    .select(PUBLIC_FIELDS)
    .eq("slug", slug)
    .eq("preview_token", token)
    .maybeSingle();
  return data ? normalize(data as Record<string, unknown>) : null;
}

/** Active product with variants/images for the landing order form. */
export const getLandingProduct = unstable_cache(
  async (productId: string): Promise<ProductWithRelations | null> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("products")
      .select("*, images:product_images(*), variants:product_variants(*), category:categories(*)")
      .eq("id", productId)
      .eq("is_active", true)
      .maybeSingle();
    if (!data) return null;
    const p = data as ProductWithRelations;
    p.images = [...(p.images ?? [])].sort((a, b) => a.position - b.position);
    p.variants = [...(p.variants ?? [])].sort((a, b) => a.position - b.position);
    return p;
  },
  ["landing-product-v1"],
  { revalidate: 120, tags: ["catalog"] },
);

// ── Admin (callers must have checked content.manage) ────────────

export type LandingListRow = {
  id: string;
  slug: string;
  title: string;
  locale: string;
  status: string;
  updated_at: string;
  product: { name_ar: string; name_fr: string | null; name_en: string | null } | null;
  visits: number;
  orders: number;
};

/** Pages with 30-day visits (page views) and orders attributed to each. */
export async function listLandingPages(): Promise<LandingListRow[]> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const [pages, views, orders] = await Promise.all([
    supabase
      .from("landing_pages")
      .select("id, slug, title, locale, status, updated_at, product:products(name_ar, name_fr, name_en)")
      .order("updated_at", { ascending: false }),
    supabase.from("analytics").select("path").eq("event_type", "page_view").like("path", "%/lp/%").gte("created_at", since).limit(50000),
    supabase.from("orders").select("attribution").not("attribution->>lp", "is", null).eq("is_spam", false).gte("created_at", since).limit(20000),
  ]);
  const visits = new Map<string, number>();
  for (const v of (views.data as { path: string }[] | null) ?? []) {
    const slug = v.path.split("/lp/")[1]?.split(/[/?#]/)[0];
    if (slug) visits.set(slug, (visits.get(slug) ?? 0) + 1);
  }
  const sold = new Map<string, number>();
  for (const o of (orders.data as { attribution: Record<string, string> }[] | null) ?? []) {
    const slug = o.attribution?.lp;
    if (slug) sold.set(slug, (sold.get(slug) ?? 0) + 1);
  }
  return ((pages.data as Omit<LandingListRow, "visits" | "orders">[] | null) ?? []).map((p) => ({
    ...p,
    product: Array.isArray(p.product) ? p.product[0] ?? null : p.product,
    visits: visits.get(p.slug) ?? 0,
    orders: sold.get(p.slug) ?? 0,
  }));
}

export async function getLandingForEdit(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = createAdminClient();
  const { data } = await supabase.from("landing_pages").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return { ...normalize(row), preview_token: String(row.preview_token) };
}
