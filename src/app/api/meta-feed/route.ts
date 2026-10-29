import type { NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { isLocale, defaultLocale } from "@/i18n/config";
import { SITE_URL as base } from "@/lib/site";
import { toCsv } from "@/lib/csv";

type FeedProduct = {
  id: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  total_stock: number;
  vendor: string | null;
  images: { url: string; position: number }[] | null;
  [k: string]: unknown;
};

/**
 * Meta (Facebook/Instagram) product catalog feed — CSV.
 * Point a scheduled feed at /api/meta-feed (optionally ?lang=fr) in
 * Meta Commerce Manager. `id` matches the pixel content_ids for DPA.
 * Uses the anon client: only active products are readable (RLS).
 */
export async function GET(req: NextRequest) {
  const langParam = req.nextUrl.searchParams.get("lang");
  const lang = isLocale(langParam) ? langParam : defaultLocale;

  const supabase = createPublicClient();
  const { data } = await supabase
    .from("products")
    .select(
      "id, slug, name_ar, name_fr, name_en, description_ar, description_fr, description_en, price, compare_at_price, total_stock, vendor, images:product_images(url, position)",
    )
    .eq("is_active", true);

  const products = (data as FeedProduct[] | null) ?? [];
  const pick = (p: FeedProduct, base: string) => (p[`${base}_${lang}`] as string) || (p[`${base}_ar`] as string) || "";

  const csv = toCsv(products, [
    { header: "id", value: (p) => p.id },
    { header: "title", value: (p) => pick(p, "name") },
    { header: "description", value: (p) => pick(p, "description") || pick(p, "name") },
    { header: "availability", value: (p) => (Number(p.total_stock) > 0 ? "in stock" : "out of stock") },
    { header: "condition", value: () => "new" },
    {
      header: "price",
      value: (p) =>
        `${Number(p.compare_at_price && p.compare_at_price > p.price ? p.compare_at_price : p.price)} DZD`,
    },
    {
      header: "sale_price",
      value: (p) => (p.compare_at_price && p.compare_at_price > p.price ? `${Number(p.price)} DZD` : ""),
    },
    { header: "link", value: (p) => `${base}/${lang}/product/${p.slug}` },
    {
      header: "image_link",
      value: (p) => [...(p.images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? "",
    },
    { header: "brand", value: (p) => p.vendor || "NONA" },
  ], { bom: false });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
