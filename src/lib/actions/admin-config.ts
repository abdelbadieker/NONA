"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdmin } from "@/lib/auth";

type Kind = "cancellation" | "return";
const tableFor = (k: Kind) =>
  k === "cancellation" ? "cancellation_reasons" : "return_reasons";

export async function addReason(
  kind: Kind,
  labels: { ar: string; fr?: string; en?: string },
  lang: string,
): Promise<{ ok: boolean }> {
  const admin = await getAdmin();
  if (!admin || !labels.ar?.trim()) return { ok: false };
  const supabase = createAdminClient();
  await supabase.from(tableFor(kind)).insert({
    label_ar: labels.ar.trim(),
    label_fr: labels.fr?.trim() || null,
    label_en: labels.en?.trim() || null,
  });
  revalidatePath(`/${lang}/admin/reasons`);
  return { ok: true };
}

export async function deleteReason(
  kind: Kind,
  id: string,
  lang: string,
): Promise<{ ok: boolean }> {
  const admin = await getAdmin();
  if (!admin) return { ok: false };
  const supabase = createAdminClient();
  await supabase.from(tableFor(kind)).delete().eq("id", id);
  revalidatePath(`/${lang}/admin/reasons`);
  return { ok: true };
}

export async function saveStoreSettings(
  store: Record<string, string>,
  social: Record<string, string>,
  lang: string,
): Promise<{ ok: boolean }> {
  const admin = await getAdmin();
  if (!admin) return { ok: false };
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  await supabase.from("settings").upsert([
    { key: "store", value: store, is_public: true, updated_at: now },
    { key: "social", value: social, is_public: true, updated_at: now },
  ]);
  updateTag("settings");
  revalidatePath(`/${lang}/admin/settings`);
  revalidatePath(`/${lang}`, "layout");
  return { ok: true };
}

export async function saveMarketing(
  input: { metaPixelId: string; metaCapiToken: string; tiktokPixelId: string },
  lang: string,
): Promise<{ ok: boolean }> {
  const admin = await getAdmin();
  if (!admin) return { ok: false };
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  await supabase.from("settings").upsert([
    {
      key: "marketing",
      value: {
        meta_pixel_id: input.metaPixelId.trim(),
        tiktok_pixel_id: input.tiktokPixelId.trim(),
      },
      is_public: true,
      updated_at: now,
    },
    {
      key: "marketing_secret",
      value: { meta_capi_token: input.metaCapiToken.trim() },
      is_public: false,
      updated_at: now,
    },
  ]);
  updateTag("settings");
  revalidatePath(`/${lang}`, "layout");
  revalidatePath(`/${lang}/admin/settings`);
  return { ok: true };
}

export async function saveDeliveryFees(
  fees: { id: string; home_fee: number; stopdesk_fee: number }[],
  lang: string,
): Promise<{ ok: boolean }> {
  const admin = await getAdmin();
  if (!admin) return { ok: false };
  const supabase = createAdminClient();
  await Promise.all(
    fees.map((f) =>
      supabase
        .from("delivery_fees")
        .update({ home_fee: f.home_fee, stopdesk_fee: f.stopdesk_fee })
        .eq("id", f.id),
    ),
  );
  updateTag("settings");
  revalidatePath(`/${lang}/admin/settings`);
  return { ok: true };
}
