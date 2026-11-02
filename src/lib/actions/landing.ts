"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorize } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { landingInputSchema, type LandingInput } from "@/lib/landing";
import { isLocale, locales } from "@/i18n/config";

type Result = { ok: true; id: string } | { ok: false; error: string };

function revalidateLanding(lang: string, slug?: string) {
  updateTag("landing");
  if (slug) for (const l of locales) revalidatePath(`/${l}/lp/${slug}`);
  revalidatePath(`/${isLocale(lang) ? lang : "ar"}/admin/landing`);
}

export async function saveLanding(input: LandingInput, lang: string): Promise<Result> {
  const staff = await authorize("content.manage");
  if (!staff) return { ok: false, error: "forbidden" };
  const parsed = landingInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || "validation" };
  const d = parsed.data;

  const supabase = createAdminClient();
  if (d.productId) {
    const { data: p } = await supabase.from("products").select("id").eq("id", d.productId).maybeSingle();
    if (!p) return { ok: false, error: "validation" };
  }
  const { data: prev } = d.id
    ? await supabase.from("landing_pages").select("slug, status, published_at").eq("id", d.id).maybeSingle()
    : { data: null };

  const row = {
    title: d.title,
    slug: d.slug,
    product_id: d.productId,
    locale: d.locale,
    status: d.status,
    blocks: d.blocks,
    form: d.form,
    seo: d.seo,
    published_at: d.status === "published" ? (prev?.published_at ?? new Date().toISOString()) : prev?.published_at ?? null,
    updated_by: staff.id,
  };

  let id = d.id;
  if (id) {
    const { error } = await supabase.from("landing_pages").update(row).eq("id", id);
    if (error) return { ok: false, error: error.code === "23505" ? "slug" : "generic" };
  } else {
    const { data, error } = await supabase
      .from("landing_pages")
      .insert({ ...row, created_by: staff.id })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: error?.code === "23505" ? "slug" : "generic" };
    id = data.id as string;
  }

  await audit(staff, d.id ? "landing.update" : "landing.create", "landing_page", id, {
    slug: d.slug,
    status: d.status,
    was: prev?.status ?? null,
    blocks: d.blocks.length,
  });
  revalidateLanding(lang, d.slug);
  if (prev?.slug && prev.slug !== d.slug) revalidateLanding(lang, prev.slug);
  return { ok: true, id };
}

export async function duplicateLanding(id: string, lang: string): Promise<Result> {
  const staff = await authorize("content.manage");
  if (!staff) return { ok: false, error: "forbidden" };
  const supabase = createAdminClient();
  const { data: src } = await supabase
    .from("landing_pages")
    .select("title, slug, product_id, locale, blocks, form, seo")
    .eq("id", id)
    .maybeSingle();
  if (!src) return { ok: false, error: "not_found" };

  let slug = `${src.slug}-copy`.slice(0, 80);
  for (let n = 2; n < 50; n++) {
    const { count } = await supabase.from("landing_pages").select("id", { count: "exact", head: true }).eq("slug", slug);
    if (!count) break;
    slug = `${src.slug}-copy-${n}`.slice(0, 80);
  }
  const { data, error } = await supabase
    .from("landing_pages")
    .insert({ ...src, slug, title: `${src.title} (copy)`, status: "draft", created_by: staff.id, updated_by: staff.id })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "generic" };
  await audit(staff, "landing.duplicate", "landing_page", data.id as string, { from: id });
  revalidateLanding(lang);
  return { ok: true, id: data.id as string };
}

/** Permanent delete (orders keep their attribution text). */
export async function deleteLanding(id: string, lang: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await authorize("content.manage");
  if (!staff) return { ok: false, error: "forbidden" };
  const supabase = createAdminClient();
  const { data } = await supabase.from("landing_pages").delete().eq("id", id).select("slug");
  if (!data?.length) return { ok: false, error: "not_found" };
  await audit(staff, "landing.delete", "landing_page", id, { slug: data[0].slug });
  revalidateLanding(lang, data[0].slug as string);
  return { ok: true };
}
