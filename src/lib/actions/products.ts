"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdmin } from "@/lib/auth";
import { productInputSchema, type ProductInput } from "@/lib/validation";

type SaveResult =
  | { ok: true; id: string }
  | { ok: false; error: "auth" | "validation" | "slug" | "generic" };

export async function saveProduct(
  input: ProductInput,
  lang: string,
): Promise<SaveResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "auth" };

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const d = parsed.data;

  const supabase = createAdminClient();

  const fields = {
    slug: d.slug,
    category_id: d.category_id ?? null,
    name_ar: d.name_ar,
    name_fr: d.name_fr ?? null,
    name_en: d.name_en ?? null,
    description_ar: d.description_ar ?? null,
    description_fr: d.description_fr ?? null,
    description_en: d.description_en ?? null,
    price: d.price,
    compare_at_price: d.compare_at_price ?? null,
    is_active: d.is_active,
    is_featured: d.is_featured,
    is_best_seller: d.is_best_seller,
    delivery_days_min: d.delivery_days_min ?? null,
    delivery_days_max: d.delivery_days_max ?? null,
  };

  let productId = d.id;
  if (productId) {
    const { error } = await supabase
      .from("products")
      .update(fields)
      .eq("id", productId);
    if (error) return { ok: false, error: error.code === "23505" ? "slug" : "generic" };
  } else {
    const { data, error } = await supabase
      .from("products")
      .insert(fields)
      .select("id")
      .single();
    if (error || !data) {
      return { ok: false, error: error?.code === "23505" ? "slug" : "generic" };
    }
    productId = data.id as string;
  }

  // Images — replace all.
  await supabase.from("product_images").delete().eq("product_id", productId);
  if (d.images.length) {
    await supabase.from("product_images").insert(
      d.images.map((url, i) => ({ product_id: productId, url, position: i })),
    );
  }

  // Variants — sync (keep existing by id, insert new, delete removed).
  const { data: existing } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId);
  const keep = new Set(d.variants.filter((v) => v.id).map((v) => v.id));
  const toDelete = ((existing as { id: string }[] | null) ?? [])
    .map((r) => r.id)
    .filter((id) => !keep.has(id));
  if (toDelete.length) {
    await supabase.from("product_variants").delete().in("id", toDelete);
  }

  for (let i = 0; i < d.variants.length; i++) {
    const v = d.variants[i];
    const row = {
      product_id: productId,
      size: v.size ?? null,
      color: v.color ?? null,
      color_hex: v.color_hex ?? null,
      stock: v.stock,
      price_override: v.price_override ?? null,
      position: i,
    };
    if (v.id) {
      await supabase.from("product_variants").update(row).eq("id", v.id);
    } else {
      await supabase.from("product_variants").insert(row);
    }
  }

  updateTag("catalog");
  revalidatePath(`/${lang}/admin/products`);
  revalidatePath(`/${lang}/admin`);
  return { ok: true, id: productId };
}

export async function deleteProduct(
  id: string,
  lang: string,
): Promise<{ ok: boolean }> {
  const admin = await getAdmin();
  if (!admin) return { ok: false };
  const supabase = createAdminClient();
  await supabase.from("products").delete().eq("id", id);
  updateTag("catalog");
  revalidatePath(`/${lang}/admin/products`);
  return { ok: true };
}

export async function toggleProductActive(
  id: string,
  isActive: boolean,
  lang: string,
): Promise<{ ok: boolean }> {
  const admin = await getAdmin();
  if (!admin) return { ok: false };
  const supabase = createAdminClient();
  await supabase.from("products").update({ is_active: isActive }).eq("id", id);
  updateTag("catalog");
  revalidatePath(`/${lang}/admin/products`);
  return { ok: true };
}
