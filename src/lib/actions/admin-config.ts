"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorize } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { revalidateStore } from "@/lib/actions/revalidate";
import { isLocale } from "@/i18n/config";
import {
  deliveryFeeRowSchema,
  deliverySettingsSchema,
  homeContentSchema,
  marketingInputSchema,
  socialSettingsSchema,
  storeSettingsSchema,
  themeSchema,
} from "@/lib/validation";
import { z } from "zod";

type Result = { ok: true } | { ok: false; error: string };
type Kind = "cancellation" | "return";
const tableFor = (k: Kind) => (k === "cancellation" ? "cancellation_reasons" : "return_reasons");
const langOf = (lang: string) => (isLocale(lang) ? lang : "ar");

export async function addReason(
  kind: Kind,
  labels: { ar: string; fr?: string; en?: string },
  lang: string,
): Promise<Result> {
  const staff = await authorize("settings.manage");
  if (!staff) return { ok: false, error: "auth" };
  const ar = labels.ar?.trim();
  if (!ar || ar.length > 80) return { ok: false, error: "validation" };
  const supabase = createAdminClient();
  const { error } = await supabase.from(tableFor(kind)).insert({
    label_ar: ar,
    label_fr: labels.fr?.trim().slice(0, 80) || null,
    label_en: labels.en?.trim().slice(0, 80) || null,
  });
  if (error) return { ok: false, error: "generic" };
  await audit(staff, "settings.reason.add", tableFor(kind), null, { label: ar });
  revalidatePath(`/${langOf(lang)}/admin/reasons`);
  return { ok: true };
}

/** Deactivates (not deletes) so past orders keep their reason for reports. */
export async function deleteReason(kind: Kind, id: string, lang: string): Promise<Result> {
  const staff = await authorize("settings.manage");
  if (!staff) return { ok: false, error: "auth" };
  const supabase = createAdminClient();
  const { error } = await supabase.from(tableFor(kind)).update({ is_active: false }).eq("id", id);
  if (error) return { ok: false, error: "generic" };
  await audit(staff, "settings.reason.deactivate", tableFor(kind), id);
  revalidatePath(`/${langOf(lang)}/admin/reasons`);
  return { ok: true };
}

export async function saveStoreSettings(
  store: Record<string, string>,
  social: Record<string, string>,
  lang: string,
): Promise<Result> {
  const staff = await authorize("settings.manage");
  if (!staff) return { ok: false, error: "auth" };
  const s = storeSettingsSchema.safeParse(store);
  const so = socialSettingsSchema.safeParse(social);
  if (!s.success || !so.success) return { ok: false, error: "validation" };

  const supabase = createAdminClient();
  // Merge so keys this form doesn't edit (e.g. wilaya_code) are preserved.
  const { data: prev } = await supabase.from("settings").select("value").eq("key", "store").maybeSingle();
  const now = new Date().toISOString();
  const { error } = await supabase.from("settings").upsert([
    { key: "store", value: { ...((prev?.value as object) ?? {}), ...s.data }, is_public: true, updated_at: now },
    { key: "social", value: so.data, is_public: true, updated_at: now },
  ]);
  if (error) return { ok: false, error: "generic" };
  await audit(staff, "settings.store", "settings", "store");
  updateTag("settings");
  revalidateStore();
  revalidatePath(`/${langOf(lang)}/admin/settings`);
  revalidatePath(`/${langOf(lang)}`, "layout");
  return { ok: true };
}

export async function saveDeliverySettings(
  input: z.input<typeof deliverySettingsSchema>,
  lang: string,
): Promise<Result> {
  const staff = await authorize("settings.manage");
  if (!staff) return { ok: false, error: "auth" };
  const parsed = deliverySettingsSchema.safeParse(input);
  if (!parsed.success || parsed.data.defaultDaysMax < parsed.data.defaultDaysMin) {
    return { ok: false, error: "validation" };
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from("settings").upsert({
    key: "delivery",
    value: {
      free_threshold: parsed.data.freeThreshold,
      default_days_min: parsed.data.defaultDaysMin,
      default_days_max: parsed.data.defaultDaysMax,
    },
    is_public: true,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "generic" };
  await audit(staff, "settings.delivery", "settings", "delivery", parsed.data);
  updateTag("settings");
  revalidateStore();
  revalidatePath(`/${langOf(lang)}/admin/settings`);
  return { ok: true };
}

/**
 * Tracking IDs are validated against each provider's format because they are
 * written into inline <script> tags. The Conversions API token is write-only:
 * empty keeps the stored token, "-" removes it.
 */
export async function saveMarketing(
  input: { metaPixelId: string; metaCapiToken: string; tiktokPixelId: string; ga4Id?: string },
  lang: string,
): Promise<Result> {
  const staff = await authorize("marketing.manage");
  if (!staff) return { ok: false, error: "auth" };
  const parsed = marketingInputSchema.safeParse({ ga4Id: "", ...input });
  if (!parsed.success) {
    return { ok: false, error: `validation:${String(parsed.error.issues[0]?.path[0] ?? "")}` };
  }
  const d = parsed.data;
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const rows: { key: string; value: unknown; is_public: boolean; updated_at: string }[] = [
    {
      key: "marketing",
      value: { meta_pixel_id: d.metaPixelId, tiktok_pixel_id: d.tiktokPixelId, ga4_id: d.ga4Id },
      is_public: true,
      updated_at: now,
    },
  ];
  if (d.metaCapiToken) {
    rows.push({
      key: "marketing_secret",
      value: { meta_capi_token: d.metaCapiToken === "-" ? "" : d.metaCapiToken },
      is_public: false,
      updated_at: now,
    });
  }
  const { error } = await supabase.from("settings").upsert(rows);
  if (error) return { ok: false, error: "generic" };
  await audit(staff, "settings.marketing", "settings", "marketing", {
    meta_pixel: !!d.metaPixelId,
    tiktok_pixel: !!d.tiktokPixelId,
    ga4: !!d.ga4Id,
    capi_token: d.metaCapiToken ? (d.metaCapiToken === "-" ? "removed" : "replaced") : "unchanged",
  });
  updateTag("settings");
  revalidateStore();
  revalidatePath(`/${langOf(lang)}`, "layout");
  revalidatePath(`/${langOf(lang)}/admin/settings`);
  return { ok: true };
}

export async function saveAppearance(
  input: {
    theme: Record<string, string>;
    home: { heroImage: string; ar: Record<string, string>; fr: Record<string, string>; en: Record<string, string> };
  },
  lang: string,
): Promise<Result> {
  const staff = await authorize("content.manage");
  if (!staff) return { ok: false, error: "auth" };
  const theme = themeSchema.safeParse(input.theme);
  const home = homeContentSchema.safeParse(input.home);
  if (!theme.success || !home.success) return { ok: false, error: "validation" };

  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("settings").upsert([
    { key: "theme", value: theme.data, is_public: true, updated_at: now },
    {
      key: "home",
      value: { hero_image: home.data.heroImage, ar: home.data.ar, fr: home.data.fr, en: home.data.en },
      is_public: true,
      updated_at: now,
    },
  ]);
  if (error) return { ok: false, error: "generic" };
  await audit(staff, "settings.appearance", "settings", "theme");
  updateTag("settings");
  revalidateStore();
  revalidatePath(`/${langOf(lang)}`, "layout");
  revalidatePath(`/${langOf(lang)}/admin/appearance`);
  return { ok: true };
}

export async function saveDeliveryFees(
  fees: z.input<typeof deliveryFeeRowSchema>[],
  lang: string,
): Promise<Result> {
  const staff = await authorize("settings.manage");
  if (!staff) return { ok: false, error: "auth" };
  const parsed = z.array(deliveryFeeRowSchema).max(58).safeParse(fees);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = createAdminClient();
  const results = await Promise.all(
    parsed.data.map((f) =>
      supabase
        .from("delivery_fees")
        .update({
          home_fee: f.home_fee,
          stopdesk_fee: f.stopdesk_fee,
          is_active: f.is_active,
          home_enabled: f.home_enabled,
          stopdesk_enabled: f.stopdesk_enabled,
        })
        .eq("id", f.id),
    ),
  );
  if (results.some((r) => r.error)) return { ok: false, error: "generic" };
  await audit(staff, "settings.delivery_fees", "delivery_fees", null, { rows: parsed.data.length });
  updateTag("settings");
  revalidateStore();
  revalidatePath(`/${langOf(lang)}/admin/settings`);
  return { ok: true };
}
