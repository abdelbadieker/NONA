"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorize } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { revalidateStore } from "@/lib/actions/revalidate";
import { productInputSchema, type ProductInput } from "@/lib/validation";
import { isLocale } from "@/i18n/config";

type SaveResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error:
        | "auth"
        | "validation"
        | "slug"
        | "stock_conflict"
        | "variant_conflict"
        | "generic";
      detail?: string;
    };

const langOf = (lang: string) => (isLocale(lang) ? lang : "ar");

function revalidateProducts(lang: string, slug?: string) {
  updateTag("catalog");
  revalidateStore(slug);
  revalidatePath(`/${langOf(lang)}/admin/products`);
  revalidatePath(`/${langOf(lang)}/admin/inventory`);
  revalidatePath(`/${langOf(lang)}/admin`);
}

export async function saveProduct(input: ProductInput, lang: string): Promise<SaveResult> {
  const staff = await authorize("products.manage");
  if (!staff) return { ok: false, error: "auth" };

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", detail: parsed.error.issues[0]?.message };
  }
  const d = parsed.data;
  const supabase = createAdminClient();

  // Optimistic concurrency on stock: refuse to save if anyone (an order
  // confirmation, another editor) changed stock since this form loaded.
  const existingIds = d.variants.filter((v) => v.id).map((v) => v.id as string);
  if (d.id && existingIds.length) {
    const { data: current } = await supabase
      .from("product_variants")
      .select("id, stock, product_id")
      .in("id", existingIds);
    const byId = new Map(((current as { id: string; stock: number; product_id: string }[] | null) ?? []).map((r) => [r.id, r]));
    for (const v of d.variants) {
      if (!v.id) continue;
      const row = byId.get(v.id);
      if (!row || row.product_id !== d.id) return { ok: false, error: "validation", detail: "variant_mismatch" };
      if (v.expected_stock != null && row.stock !== v.expected_stock) {
        return { ok: false, error: "stock_conflict" };
      }
    }
  }

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
    cost_price: d.cost_price ?? null,
    vendor: d.vendor ?? null,
    product_type: d.product_type ?? null,
    tags: [...new Set(d.tags)],
    weight_grams: d.weight_grams ?? null,
    internal_notes: d.internal_notes ?? null,
    seo: d.seo,
    details: d.details,
    is_active: d.is_active,
    is_featured: d.is_featured,
    is_best_seller: d.is_best_seller,
    delivery_days_min: d.delivery_days_min ?? null,
    delivery_days_max: d.delivery_days_max ?? null,
  };

  let productId = d.id;
  if (productId) {
    const { data: prev } = await supabase
      .from("products")
      .select("archived_at, price")
      .eq("id", productId)
      .maybeSingle();
    if (!prev) return { ok: false, error: "generic" };
    // Publishing an archived product implicitly restores it.
    const patch = d.is_active && prev.archived_at ? { ...fields, archived_at: null } : fields;
    const { error } = await supabase.from("products").update(patch).eq("id", productId);
    if (error) return { ok: false, error: error.code === "23505" ? "slug" : "generic" };
    if (Number(prev.price) !== d.price) {
      await audit(staff, "product.price", "product", productId, { from: Number(prev.price), to: d.price });
    }
  } else {
    const { data, error } = await supabase.from("products").insert(fields).select("id").single();
    if (error || !data) return { ok: false, error: error?.code === "23505" ? "slug" : "generic" };
    productId = data.id as string;
  }

  // Images: keep order, delete removed, insert new — never drop all first.
  const { data: imgRows } = await supabase
    .from("product_images")
    .select("id, url")
    .eq("product_id", productId);
  const existingImgs = (imgRows as { id: string; url: string }[] | null) ?? [];
  const wanted = [...new Set(d.images)];
  const removeImgs = existingImgs.filter((i) => !wanted.includes(i.url)).map((i) => i.id);
  if (removeImgs.length) await supabase.from("product_images").delete().in("id", removeImgs);
  for (let i = 0; i < wanted.length; i++) {
    const found = existingImgs.find((x) => x.url === wanted[i]);
    if (found) await supabase.from("product_images").update({ position: i }).eq("id", found.id);
    else await supabase.from("product_images").insert({ product_id: productId, url: wanted[i], position: i });
  }

  // Variants removed from the form: delete if never ordered, else deactivate
  // (keeps order history and stock logs linked).
  const { data: allVariants } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId);
  const keep = new Set(existingIds);
  const removed = ((allVariants as { id: string }[] | null) ?? []).map((r) => r.id).filter((id) => !keep.has(id));
  if (removed.length) {
    const { data: ordered } = await supabase
      .from("order_items")
      .select("variant_id")
      .in("variant_id", removed);
    const orderedSet = new Set(((ordered as { variant_id: string }[] | null) ?? []).map((r) => r.variant_id));
    const del = removed.filter((id) => !orderedSet.has(id));
    const deactivate = removed.filter((id) => orderedSet.has(id));
    if (del.length) await supabase.from("product_variants").delete().in("id", del);
    if (deactivate.length) {
      await supabase.from("product_variants").update({ is_active: false }).in("id", deactivate);
    }
  }

  for (let i = 0; i < d.variants.length; i++) {
    const v = d.variants[i];
    const row = {
      product_id: productId,
      size: v.size || null,
      color: v.color || null,
      color_hex: v.color_hex || null,
      sku: v.sku || null,
      barcode: v.barcode || null,
      price_override: v.price_override ?? null,
      cost_price: v.cost_price ?? null,
      image_url: v.image_url || null,
      position: i,
      is_active: true,
    };
    if (v.id) {
      const { error } = await supabase
        .from("product_variants")
        .update(row)
        .eq("id", v.id)
        .eq("product_id", productId);
      if (error) return { ok: false, error: "variant_conflict", detail: error.code };
      const delta = v.expected_stock != null ? v.stock - v.expected_stock : 0;
      if (delta !== 0) {
        const { data: adj } = await supabase.rpc("adjust_inventory", {
          p_variant: v.id,
          p_delta: delta,
          p_reason: "correction",
          p_note: "product editor",
          p_actor: staff.id,
          p_expected: v.expected_stock,
        });
        if (!(adj as { ok?: boolean } | null)?.ok) return { ok: false, error: "stock_conflict" };
      }
    } else {
      const { data: inserted, error } = await supabase
        .from("product_variants")
        .insert({ ...row, stock: 0 })
        .select("id")
        .single();
      if (error || !inserted) return { ok: false, error: "variant_conflict", detail: error?.code };
      if (v.stock > 0) {
        await supabase.rpc("adjust_inventory", {
          p_variant: inserted.id,
          p_delta: v.stock,
          p_reason: "initial",
          p_note: null,
          p_actor: staff.id,
          p_expected: 0,
        });
      }
    }
  }

  await audit(staff, d.id ? "product.update" : "product.create", "product", productId, {
    slug: d.slug,
    variants: d.variants.length,
    active: d.is_active,
  });
  revalidateProducts(lang, d.slug);
  return { ok: true, id: productId };
}

type SimpleResult = { ok: true } | { ok: false; error: string };

/** Archive = hidden everywhere, kept for order history. Reversible. */
export async function archiveProduct(id: string, lang: string): Promise<SimpleResult> {
  const staff = await authorize("products.manage");
  if (!staff) return { ok: false, error: "auth" };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("products")
    .update({ is_active: false, archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "generic" };
  await audit(staff, "product.archive", "product", id);
  revalidateProducts(lang);
  return { ok: true };
}

/** Restore an archived product as a hidden draft. */
export async function restoreProduct(id: string, lang: string): Promise<SimpleResult> {
  const staff = await authorize("products.manage");
  if (!staff) return { ok: false, error: "auth" };
  const supabase = createAdminClient();
  const { error } = await supabase.from("products").update({ archived_at: null }).eq("id", id);
  if (error) return { ok: false, error: "generic" };
  await audit(staff, "product.restore", "product", id);
  revalidateProducts(lang);
  return { ok: true };
}

/**
 * Permanent delete — only for products that were never ordered (otherwise
 * archive). Order lines keep their snapshot either way.
 */
export async function deleteProduct(id: string, lang: string): Promise<SimpleResult> {
  const staff = await authorize("products.manage");
  if (!staff) return { ok: false, error: "auth" };
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);
  if ((count ?? 0) > 0) return { ok: false, error: "has_orders" };
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: "generic" };
  await audit(staff, "product.delete", "product", id);
  revalidateProducts(lang);
  return { ok: true };
}

export async function toggleProductActive(id: string, isActive: boolean, lang: string): Promise<SimpleResult> {
  const staff = await authorize("products.manage");
  if (!staff) return { ok: false, error: "auth" };
  const supabase = createAdminClient();
  const patch = isActive ? { is_active: true, archived_at: null } : { is_active: false };
  const { error } = await supabase.from("products").update(patch).eq("id", id);
  if (error) return { ok: false, error: "generic" };
  await audit(staff, isActive ? "product.publish" : "product.unpublish", "product", id);
  revalidateProducts(lang);
  return { ok: true };
}

/** Copy a product as a hidden draft (variants copied with zero stock). */
export async function duplicateProduct(id: string, lang: string): Promise<SimpleResult & { id?: string }> {
  const staff = await authorize("products.manage");
  if (!staff) return { ok: false, error: "auth" };
  const supabase = createAdminClient();
  const { data: src } = await supabase
    .from("products")
    .select("*, images:product_images(url, position), variants:product_variants(*)")
    .eq("id", id)
    .maybeSingle();
  if (!src) return { ok: false, error: "not_found" };

  const {
    id: _id,
    created_at: _c,
    updated_at: _u,
    status: _s,
    total_stock: _t,
    sold_count: _sc,
    images,
    variants,
    ...rest
  } = src as Record<string, unknown> & {
    images: { url: string; position: number }[];
    variants: Record<string, unknown>[];
  };
  void _id; void _c; void _u; void _s; void _t; void _sc;

  let slug = `${src.slug}-copy`;
  for (let n = 2; n < 50; n++) {
    const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("slug", slug);
    if (!count) break;
    slug = `${src.slug}-copy-${n}`;
  }

  const { data: created, error } = await supabase
    .from("products")
    .insert({
      ...rest,
      slug,
      name_ar: `${src.name_ar} (نسخة)`,
      is_active: false,
      is_featured: false,
      is_best_seller: false,
      archived_at: null,
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false, error: "generic" };

  if (images?.length) {
    await supabase
      .from("product_images")
      .insert(images.map((i) => ({ product_id: created.id, url: i.url, position: i.position })));
  }
  if (variants?.length) {
    await supabase.from("product_variants").insert(
      variants.map((v) => ({
        product_id: created.id,
        size: v.size,
        color: v.color,
        color_hex: v.color_hex,
        price_override: v.price_override,
        cost_price: v.cost_price,
        image_url: v.image_url,
        position: v.position,
        is_active: v.is_active,
        stock: 0,
      })),
    );
  }
  await audit(staff, "product.duplicate", "product", created.id, { from: id });
  revalidateProducts(lang);
  return { ok: true, id: created.id };
}

export type BulkAction = "publish" | "unpublish" | "archive" | "restore" | "feature" | "unfeature";

export async function bulkUpdateProducts(
  ids: string[],
  action: BulkAction,
  lang: string,
): Promise<SimpleResult & { count?: number }> {
  const staff = await authorize("products.manage");
  if (!staff) return { ok: false, error: "auth" };
  const clean = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 200);
  if (!clean.length) return { ok: false, error: "validation" };

  const patches: Record<BulkAction, Record<string, unknown>> = {
    publish: { is_active: true, archived_at: null },
    unpublish: { is_active: false },
    archive: { is_active: false, archived_at: new Date().toISOString() },
    restore: { archived_at: null },
    feature: { is_featured: true },
    unfeature: { is_featured: false },
  };
  const supabase = createAdminClient();
  const { error } = await supabase.from("products").update(patches[action]).in("id", clean);
  if (error) return { ok: false, error: "generic" };
  await audit(staff, `product.bulk.${action}`, "product", null, { ids: clean });
  revalidateProducts(lang);
  return { ok: true, count: clean.length };
}

/** Bulk price change by a percentage (e.g. -20 for a sale), rounded to 10 DA. */
export async function bulkAdjustPrice(
  ids: string[],
  percent: number,
  lang: string,
): Promise<SimpleResult & { count?: number }> {
  const staff = await authorize("products.manage");
  if (!staff) return { ok: false, error: "auth" };
  if (!Number.isFinite(percent) || percent < -90 || percent > 500 || percent === 0) {
    return { ok: false, error: "validation" };
  }
  const clean = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 200);
  const supabase = createAdminClient();
  const { data } = await supabase.from("products").select("id, price").in("id", clean);
  const rows = (data as { id: string; price: number }[] | null) ?? [];
  for (const r of rows) {
    const next = Math.max(0, Math.round((Number(r.price) * (1 + percent / 100)) / 10) * 10);
    await supabase.from("products").update({ price: next }).eq("id", r.id);
  }
  await audit(staff, "product.bulk.price", "product", null, { ids: rows.map((r) => r.id), percent });
  revalidateProducts(lang);
  return { ok: true, count: rows.length };
}
