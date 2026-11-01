"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorize } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientFingerprint, rateLimit } from "@/lib/rate-limit";
import { deriveAdSource } from "@/lib/attribution";
import { SITE_URL } from "@/lib/site";
import { leadInputSchema } from "@/lib/validation";
import { isLocale } from "@/i18n/config";

const LEAD_RETENTION_DAYS = 30;

/**
 * Abandoned-checkout lead: saved once a shopper has typed a name and a valid
 * phone at checkout. One row per phone (upsert); removed automatically when
 * that phone places an order, and purged after 30 days. Best-effort: never
 * blocks the checkout.
 */
export async function captureLead(input: {
  customerName: string;
  customerPhone: string;
  wilayaCode?: number | null;
  commune?: string;
  productSlug?: string;
  productName?: string;
  locale: string;
  utm?: Record<string, string>;
}): Promise<{ ok: boolean }> {
  const parsed = leadInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  if (!(await rateLimit(`lead:${await clientFingerprint()}`, 20, 600))) return { ok: false };
  const d = parsed.data;
  let host: string | undefined;
  try {
    host = new URL(SITE_URL).host;
  } catch {}

  const supabase = createAdminClient();
  const { error } = await supabase.from("leads").upsert(
    {
      customer_name: d.customerName,
      customer_phone: d.customerPhone,
      wilaya_code: d.wilayaCode ?? null,
      commune: d.commune || null,
      product_slug: d.productSlug || null,
      product_name: d.productName || null,
      locale: d.locale,
      ad_source: deriveAdSource(d.utm, host),
      attribution: d.utm ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "customer_phone" },
  );
  if (error) console.error("[captureLead]", error.message);

  if (Math.random() < 0.05) {
    await supabase
      .from("leads")
      .delete()
      .lt("updated_at", new Date(Date.now() - LEAD_RETENTION_DAYS * 864e5).toISOString());
  }
  return { ok: !error };
}

export async function deleteLead(id: string, lang: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await authorize("orders.manage");
  if (!staff) return { ok: false, error: "forbidden" };
  const supabase = createAdminClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) return { ok: false, error: "generic" };
  await audit(staff, "lead.delete", "lead", id);
  revalidatePath(`/${isLocale(lang) ? lang : "ar"}/admin/leads`);
  return { ok: true };
}

export async function addBlockedPhone(phone: string, reason: string, lang: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await authorize("orders.manage");
  if (!staff) return { ok: false, error: "forbidden" };
  const p = phone.replace(/\D/g, "");
  if (!/^0[5-7]\d{8}$/.test(p)) return { ok: false, error: "validation" };
  const supabase = createAdminClient();
  const { error } = await supabase.from("blocked_phones").upsert({ phone: p, reason: reason.trim().slice(0, 200) || null });
  if (error) return { ok: false, error: "generic" };
  await audit(staff, "phone.block", "blocked_phone", p.slice(0, 4) + "******");
  revalidatePath(`/${isLocale(lang) ? lang : "ar"}/admin/leads`);
  return { ok: true };
}

export async function removeBlockedPhone(phone: string, lang: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await authorize("orders.manage");
  if (!staff) return { ok: false, error: "forbidden" };
  const supabase = createAdminClient();
  const { error } = await supabase.from("blocked_phones").delete().eq("phone", phone);
  if (error) return { ok: false, error: "generic" };
  await audit(staff, "phone.unblock", "blocked_phone", phone.slice(0, 4) + "******");
  revalidatePath(`/${isLocale(lang) ? lang : "ar"}/admin/leads`);
  return { ok: true };
}
