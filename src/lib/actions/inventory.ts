"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorize } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { revalidateStore } from "@/lib/actions/revalidate";
import { inventoryAdjustSchema } from "@/lib/validation";
import { isLocale } from "@/i18n/config";

export type AdjustResult =
  | { ok: true; stock: number }
  | { ok: false; error: string; stock?: number };

/** Relative stock adjustment (received, damaged, recount…), logged with a reason. */
export async function adjustStock(
  input: { variantId: string; delta: number; reason: string; note?: string; expected?: number | null },
  lang: string,
): Promise<AdjustResult> {
  const staff = await authorize("inventory.adjust");
  if (!staff) return { ok: false, error: "auth" };
  const parsed = inventoryAdjustSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const d = parsed.data;

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("adjust_inventory", {
    p_variant: d.variantId,
    p_delta: d.delta,
    p_reason: d.reason,
    p_note: d.note ?? null,
    p_actor: staff.id,
    p_expected: d.expected ?? null,
  });
  const r = (data ?? {}) as { ok?: boolean; error?: string; stock?: number };
  if (error || !r.ok) {
    return { ok: false, error: error ? "generic" : String(r.error), stock: r.stock };
  }
  await audit(staff, "inventory.adjust", "variant", d.variantId, {
    delta: d.delta,
    reason: d.reason,
    stock_after: r.stock,
  });
  updateTag("catalog");
  revalidateStore();
  revalidatePath(`/${isLocale(lang) ? lang : "ar"}/admin/inventory`);
  return { ok: true, stock: Number(r.stock) };
}

/** Per-variant low-stock alert threshold (null = use the store default). */
export async function setLowStockThreshold(
  variantId: string,
  threshold: number | null,
  lang: string,
): Promise<{ ok: boolean; error?: string }> {
  const staff = await authorize("inventory.adjust");
  if (!staff) return { ok: false, error: "auth" };
  if (threshold != null && (!Number.isInteger(threshold) || threshold < 0 || threshold > 10000)) {
    return { ok: false, error: "validation" };
  }
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("product_variants")
    .update({ low_stock_threshold: threshold })
    .eq("id", variantId);
  if (error) return { ok: false, error: "generic" };
  revalidatePath(`/${isLocale(lang) ? lang : "ar"}/admin/inventory`);
  return { ok: true };
}
