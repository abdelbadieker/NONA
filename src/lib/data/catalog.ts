import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type {
  Category,
  DeliveryFee,
  Product,
  ProductImage,
  ProductWithRelations,
} from "@/lib/types";

const CARD_FIELDS =
  "id, slug, name_ar, name_fr, name_en, price, compare_at_price, currency, total_stock, is_best_seller, is_featured, created_at, category_id, images:product_images(url, position)";

export type ProductCardData = Pick<
  Product,
  | "id"
  | "slug"
  | "name_ar"
  | "name_fr"
  | "name_en"
  | "price"
  | "compare_at_price"
  | "currency"
  | "total_stock"
  | "is_best_seller"
  | "is_featured"
  | "created_at"
  | "category_id"
> & { images: Pick<ProductImage, "url" | "position">[] };

function sortImages<T extends { images?: { position: number }[] }>(p: T): T {
  if (p.images) p.images = [...p.images].sort((a, b) => a.position - b.position);
  return p;
}

export const getCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("position", { ascending: true });
    return (data as Category[] | null) ?? [];
  },
  ["categories"],
  { revalidate: 300, tags: ["catalog"] },
);

type CardQuery = {
  categorySlug?: string;
  featured?: boolean;
  bestSeller?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "bestselling";
  limit?: number;
  excludeId?: string;
};

export const getProductCards = unstable_cache(
  async (opts: CardQuery = {}): Promise<ProductCardData[]> => {
    const supabase = createPublicClient();
    let q = supabase.from("products").select(CARD_FIELDS).eq("is_active", true);

    if (opts.featured) q = q.eq("is_featured", true);
    if (opts.bestSeller) q = q.eq("is_best_seller", true);
    if (opts.excludeId) q = q.neq("id", opts.excludeId);

    if (opts.categorySlug) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", opts.categorySlug)
        .maybeSingle();
      if (!cat?.id) return [];
      q = q.eq("category_id", cat.id);
    }

    switch (opts.sort) {
      case "price_asc":
        q = q.order("price", { ascending: true });
        break;
      case "price_desc":
        q = q.order("price", { ascending: false });
        break;
      case "bestselling":
        q = q.order("sold_count", { ascending: false });
        break;
      default:
        q = q.order("created_at", { ascending: false });
    }
    if (opts.limit) q = q.limit(opts.limit);

    const { data } = await q;
    return ((data as ProductCardData[] | null) ?? []).map(sortImages);
  },
  ["product-cards"],
  { revalidate: 120, tags: ["catalog"] },
);

export const getFeatured = (limit = 8) =>
  getProductCards({ featured: true, limit });
export const getBestSellers = (limit = 8) =>
  getProductCards({ bestSeller: true, sort: "bestselling", limit });
export const getNewArrivals = (limit = 8) =>
  getProductCards({ sort: "newest", limit });

export const getProductBySlug = unstable_cache(
  async (slug: string): Promise<ProductWithRelations | null> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("products")
      .select(
        "*, images:product_images(*), variants:product_variants(*), category:categories(*)",
      )
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (!data) return null;
    const p = data as ProductWithRelations;
    p.images = [...(p.images ?? [])].sort((a, b) => a.position - b.position);
    p.variants = [...(p.variants ?? [])].sort((a, b) => a.position - b.position);
    return p;
  },
  ["product-by-slug"],
  { revalidate: 120, tags: ["catalog"] },
);

export const searchProducts = unstable_cache(
  async (query: string): Promise<ProductCardData[]> => {
    const clean = query.replace(/[,()*%]/g, " ").trim();
    if (!clean) return [];
    const supabase = createPublicClient();
    const term = `%${clean}%`;
    const { data } = await supabase
      .from("products")
      .select(CARD_FIELDS)
      .eq("is_active", true)
      .or(`name_ar.ilike.${term},name_fr.ilike.${term},name_en.ilike.${term}`)
      .limit(40);
    return ((data as ProductCardData[] | null) ?? []).map(sortImages);
  },
  ["search-products"],
  { revalidate: 60, tags: ["catalog"] },
);

export const getDeliveryFees = unstable_cache(
  async (): Promise<DeliveryFee[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("delivery_fees")
      .select("*")
      .eq("is_active", true)
      .order("wilaya_code", { ascending: true });
    return (data as DeliveryFee[] | null) ?? [];
  },
  ["delivery-fees"],
  { revalidate: 600, tags: ["settings"] },
);
