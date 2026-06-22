import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLocale, defaultLocale } from "@/i18n/config";
import { SITE_URL as base } from "@/lib/site";

function csv(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * Meta (Facebook/Instagram) product catalog feed — CSV.
 * Point a scheduled feed at /api/meta-feed (optionally ?lang=fr) in
 * Meta Commerce Manager. `id` matches the pixel content_ids for DPA.
 */
export async function GET(req: NextRequest) {
  const langParam = req.nextUrl.searchParams.get("lang");
  const lang = isLocale(langParam) ? langParam : defaultLocale;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select(
      "id, slug, name_ar, name_fr, name_en, description_ar, description_fr, description_en, price, compare_at_price, total_stock, images:product_images(url, position)",
    )
    .eq("is_active", true);

  const products = (data as Record<string, unknown>[] | null) ?? [];
  const header = [
    "id",
    "title",
    "description",
    "availability",
    "condition",
    "price",
    "link",
    "image_link",
    "brand",
  ];
  const lines = [header.join(",")];

  for (const p of products) {
    const name =
      (p[`name_${lang}`] as string) || (p.name_ar as string) || "";
    const desc =
      (p[`description_${lang}`] as string) ||
      (p.description_ar as string) ||
      name;
    const imgs = (p.images as { url: string; position: number }[] | null) ?? [];
    const image = [...imgs].sort((a, b) => a.position - b.position)[0]?.url ?? "";
    const availability =
      Number(p.total_stock ?? 0) > 0 ? "in stock" : "out of stock";

    const row = [
      String(p.id),
      name,
      desc,
      availability,
      "new",
      `${Number(p.price)} DZD`,
      `${base}/${lang}/product/${p.slug}`,
      image,
      "NONA",
    ].map((v) => csv(v));
    lines.push(row.join(","));
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
