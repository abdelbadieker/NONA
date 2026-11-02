"use server";

import crypto from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorize } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { revalidateStore } from "@/lib/actions/revalidate";
import { sectionsSchema, type SectionInput } from "@/lib/sections";
import { isLocale } from "@/i18n/config";

// The homepage layout lives in settings: `home_sections` (published, public)
// and `home_sections_draft` (private: { sections, token }). Publishing copies
// the draft; the storefront only ever renders the published one.

type Result = { ok: true; token?: string } | { ok: false; error: string };

export async function saveHomeDraft(sections: SectionInput[], lang: string): Promise<Result> {
  const staff = await authorize("content.manage");
  if (!staff) return { ok: false, error: "forbidden" };
  const parsed = sectionsSchema.safeParse(sections);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = createAdminClient();
  const { data: prev } = await supabase.from("settings").select("value").eq("key", "home_sections_draft").maybeSingle();
  const token = ((prev?.value as { token?: string } | null)?.token) || crypto.randomUUID();
  const { error } = await supabase.from("settings").upsert({
    key: "home_sections_draft",
    value: { sections: parsed.data, token, saved_at: new Date().toISOString() },
    is_public: false,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "generic" };
  await audit(staff, "builder.save_draft", "settings", "home_sections_draft", { sections: parsed.data.length });
  revalidatePath(`/${isLocale(lang) ? lang : "ar"}/admin/builder`);
  return { ok: true, token };
}

export async function publishHome(sections: SectionInput[], lang: string): Promise<Result> {
  const staff = await authorize("content.manage");
  if (!staff) return { ok: false, error: "forbidden" };
  const parsed = sectionsSchema.safeParse(sections);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data: prev } = await supabase.from("settings").select("value").eq("key", "home_sections_draft").maybeSingle();
  const token = ((prev?.value as { token?: string } | null)?.token) || crypto.randomUUID();
  const { error } = await supabase.from("settings").upsert([
    { key: "home_sections", value: parsed.data, is_public: true, updated_at: now },
    { key: "home_sections_draft", value: { sections: parsed.data, token, saved_at: now }, is_public: false, updated_at: now },
  ]);
  if (error) return { ok: false, error: "generic" };
  await audit(staff, "builder.publish", "settings", "home_sections", { sections: parsed.data.length });
  updateTag("settings");
  revalidateStore();
  revalidatePath(`/${isLocale(lang) ? lang : "ar"}/admin/builder`);
  return { ok: true, token };
}
