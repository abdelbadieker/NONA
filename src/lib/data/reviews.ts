import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export type PublicReview = { id: string; customer_name: string; rating: number; body: string | null; created_at: string };

/**
 * Approved reviews only (RLS enforces it for the anon client too). Real
 * customer reviews replace the hard-coded testimonials the original
 * homepage showed.
 */
export const getApprovedReviews = unstable_cache(
  async (productId: string | null, limit = 20): Promise<PublicReview[]> => {
    const supabase = createPublicClient();
    let q = supabase
      .from("reviews")
      .select("id, customer_name, rating, body, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (productId) q = q.eq("product_id", productId);
    const { data, error } = await q;
    if (error) return [];
    return (data as PublicReview[] | null) ?? [];
  },
  ["approved-reviews-v1"],
  { revalidate: 300, tags: ["reviews"] },
);

export function reviewStats(reviews: PublicReview[]) {
  if (!reviews.length) return null;
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  return { count: reviews.length, average: Math.round(avg * 10) / 10 };
}
