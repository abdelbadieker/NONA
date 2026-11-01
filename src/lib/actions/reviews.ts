"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorize } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientFingerprint, rateLimit } from "@/lib/rate-limit";
import { revalidateStore } from "@/lib/actions/revalidate";
import { reviewInputSchema } from "@/lib/validation";
import { isLocale } from "@/i18n/config";

/** Customer review → 'pending' until a staff member approves it. */
export async function submitReview(input: {
  productId: string | null;
  customerName: string;
  rating: number;
  body?: string;
  website?: string;
}): Promise<{ ok: true } | { ok: false; error: "validation" | "rate" | "generic" }> {
  const parsed = reviewInputSchema.safeParse(input);
  if (!parsed.success) return input.website ? { ok: true } : { ok: false, error: "validation" };
  if (!(await rateLimit(`review:${await clientFingerprint()}`, 3, 3600))) return { ok: false, error: "rate" };
  const d = parsed.data;
  const supabase = createAdminClient();
  if (d.productId) {
    const { data: p } = await supabase.from("products").select("id").eq("id", d.productId).eq("is_active", true).maybeSingle();
    if (!p) return { ok: false, error: "validation" };
  }
  const { error } = await supabase.from("reviews").insert({
    product_id: d.productId,
    customer_name: d.customerName,
    rating: d.rating,
    body: d.body || null,
    status: "pending",
  });
  if (error) {
    console.error("[submitReview]", error.message);
    return { ok: false, error: "generic" };
  }
  return { ok: true };
}

export async function moderateReview(
  id: string,
  action: "approved" | "rejected" | "delete",
  lang: string,
): Promise<{ ok: boolean; error?: string }> {
  const staff = await authorize("products.manage");
  if (!staff) return { ok: false, error: "forbidden" };
  if (!["approved", "rejected", "delete"].includes(action)) return { ok: false, error: "validation" };
  const supabase = createAdminClient();
  const { error } =
    action === "delete"
      ? await supabase.from("reviews").delete().eq("id", id)
      : await supabase.from("reviews").update({ status: action }).eq("id", id);
  if (error) return { ok: false, error: "generic" };
  await audit(staff, `review.${action}`, "review", id);
  updateTag("reviews");
  revalidateStore();
  revalidatePath(`/${isLocale(lang) ? lang : "ar"}/admin/reviews`);
  return { ok: true };
}
