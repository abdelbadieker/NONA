"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorize } from "@/lib/auth";
import { clientFingerprint, rateLimit } from "@/lib/rate-limit";
import { contactFormSchema, newsletterSchema } from "@/lib/validation";
import { isLocale } from "@/i18n/config";

export type FormResult = { ok: true } | { ok: false; error: "validation" | "rate" | "generic" };

/** Contact / wholesale enquiry. Honeypot + per-client rate limit. */
export async function submitContactForm(input: {
  form: "contact" | "wholesale";
  name: string;
  phone?: string;
  email?: string;
  message: string;
  locale: string;
  website?: string;
}): Promise<FormResult> {
  const parsed = contactFormSchema.safeParse(input);
  if (!parsed.success) {
    // A filled honeypot is a bot: pretend success, store nothing.
    if (input.website) return { ok: true };
    return { ok: false, error: "validation" };
  }
  const fp = await clientFingerprint();
  if (!(await rateLimit(`form:${fp}`, 5, 3600))) return { ok: false, error: "rate" };

  const d = parsed.data;
  const supabase = createAdminClient();
  const { error } = await supabase.from("form_submissions").insert({
    form: d.form,
    name: d.name,
    phone: d.phone || null,
    email: d.email || null,
    message: d.message,
    locale: d.locale,
    ip_hash: fp,
  });
  if (error) {
    console.error("[forms] insert", error.message);
    return { ok: false, error: "generic" };
  }
  return { ok: true };
}

/** Newsletter: explicit consent checkbox required; re-subscribing is idempotent. */
export async function subscribeNewsletter(input: {
  email: string;
  consent: boolean;
  locale: string;
  website?: string;
}): Promise<FormResult> {
  const parsed = newsletterSchema.safeParse(input);
  if (!parsed.success) {
    if (input.website) return { ok: true };
    return { ok: false, error: "validation" };
  }
  if (!(await rateLimit(`newsletter:${await clientFingerprint()}`, 5, 3600))) {
    return { ok: false, error: "rate" };
  }
  const d = parsed.data;
  const supabase = createAdminClient();
  const { error } = await supabase.from("subscribers").upsert(
    {
      email: d.email,
      locale: d.locale,
      status: "subscribed",
      consent_at: new Date().toISOString(),
      consent_source: "storefront_form",
      unsubscribed_at: null,
    },
    { onConflict: "email" },
  );
  if (error) {
    console.error("[newsletter] upsert", error.message);
    return { ok: false, error: "generic" };
  }
  return { ok: true };
}

/** Unsubscribe via the token in a link — no login needed, no enumeration. */
export async function unsubscribe(token: string): Promise<{ ok: boolean }> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { ok: false };
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("subscribers")
    .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("id");
  return { ok: !!data?.length };
}

export async function setSubmissionStatus(
  id: string,
  status: "new" | "read" | "archived",
  lang: string,
): Promise<{ ok: boolean }> {
  const staff = await authorize("forms.view");
  if (!staff) return { ok: false };
  if (!["new", "read", "archived"].includes(status)) return { ok: false };
  const supabase = createAdminClient();
  const { error } = await supabase.from("form_submissions").update({ status }).eq("id", id);
  revalidatePath(`/${isLocale(lang) ? lang : "ar"}/admin/forms`);
  return { ok: !error };
}
