"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorize } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { customerUpdateSchema } from "@/lib/validation";
import { isLocale } from "@/i18n/config";

export async function updateCustomer(
  input: { id: string; fullName?: string; email?: string; notes?: string; tags?: string[] },
  lang: string,
): Promise<{ ok: boolean; error?: string }> {
  const staff = await authorize("customers.manage");
  if (!staff) return { ok: false, error: "auth" };
  const parsed = customerUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const d = parsed.data;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("customers")
    .update({
      full_name: d.fullName || null,
      email: d.email || null,
      notes: d.notes || null,
      tags: [...new Set(d.tags)],
    })
    .eq("id", d.id);
  if (error) return { ok: false, error: "generic" };
  await audit(staff, "customer.update", "customer", d.id, { tags: d.tags });
  revalidatePath(`/${isLocale(lang) ? lang : "ar"}/admin/customers/${d.id}`);
  return { ok: true };
}

/**
 * Withdraw marketing consent (customer asked by phone, etc.). Giving consent
 * is only possible by the customer themselves (checkout / newsletter form).
 */
export async function revokeMarketingConsent(id: string, lang: string): Promise<{ ok: boolean }> {
  const staff = await authorize("customers.manage");
  if (!staff) return { ok: false };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("customers")
    .update({ accepts_marketing: false, marketing_consent_source: "revoked_by_staff" })
    .eq("id", id);
  if (error) return { ok: false };
  await audit(staff, "customer.consent.revoke", "customer", id);
  revalidatePath(`/${isLocale(lang) ? lang : "ar"}/admin/customers/${id}`);
  return { ok: true };
}
