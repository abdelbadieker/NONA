"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorize } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { discountInputSchema, type DiscountInput } from "@/lib/validation";
import { isLocale } from "@/i18n/config";

type Result = { ok: true; id: string } | { ok: false; error: string };

export async function saveDiscount(input: DiscountInput, lang: string): Promise<Result> {
  const staff = await authorize("discounts.manage");
  if (!staff) return { ok: false, error: "auth" };
  const parsed = discountInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "validation" };
  }
  const d = parsed.data;
  const row = {
    code: d.automatic ? null : d.code,
    title: d.title,
    kind: d.kind,
    value: d.kind === "free_shipping" ? 0 : d.value,
    min_subtotal: d.min_subtotal,
    min_quantity: d.min_quantity,
    applies_to: d.applies_to,
    product_ids: d.applies_to === "products" ? d.product_ids : [],
    category_ids: d.applies_to === "categories" ? d.category_ids : [],
    starts_at: d.starts_at || null,
    ends_at: d.ends_at || null,
    usage_limit: d.usage_limit ?? null,
    once_per_customer: d.once_per_customer,
    automatic: d.automatic,
    is_active: d.is_active,
  };

  const supabase = createAdminClient();
  let id = d.id;
  if (id) {
    const { error } = await supabase.from("discounts").update(row).eq("id", id);
    if (error) return { ok: false, error: error.code === "23505" ? "code_taken" : "generic" };
  } else {
    const { data, error } = await supabase.from("discounts").insert(row).select("id").single();
    if (error || !data) return { ok: false, error: error?.code === "23505" ? "code_taken" : "generic" };
    id = data.id as string;
  }
  await audit(staff, d.id ? "discount.update" : "discount.create", "discount", id, {
    code: row.code,
    kind: row.kind,
    value: row.value,
    active: row.is_active,
  });
  revalidatePath(`/${isLocale(lang) ? lang : "ar"}/admin/discounts`);
  return { ok: true, id };
}

export async function setDiscountActive(id: string, active: boolean, lang: string): Promise<{ ok: boolean }> {
  const staff = await authorize("discounts.manage");
  if (!staff) return { ok: false };
  const supabase = createAdminClient();
  const { error } = await supabase.from("discounts").update({ is_active: active }).eq("id", id);
  if (error) return { ok: false };
  await audit(staff, active ? "discount.activate" : "discount.deactivate", "discount", id);
  revalidatePath(`/${isLocale(lang) ? lang : "ar"}/admin/discounts`);
  return { ok: true };
}
