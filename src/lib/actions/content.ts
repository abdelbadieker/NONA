"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorize } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { pageInputSchema, type PageInput } from "@/lib/validation";
import { isLocale, locales } from "@/i18n/config";

/** Slugs served by dedicated storefront routes — not available to CMS pages. */
const RESERVED = new Set(["faq", "shipping", "contact", "track", "cart", "checkout", "shop", "search", "wishlist"]);

export async function savePage(
  input: PageInput,
  lang: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const staff = await authorize("content.manage");
  if (!staff) return { ok: false, error: "auth" };
  const parsed = pageInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const d = parsed.data;
  if (RESERVED.has(d.slug)) return { ok: false, error: "slug_reserved" };

  const supabase = createAdminClient();
  const { data: prev } = d.id
    ? await supabase.from("pages").select("is_published, published_at").eq("id", d.id).maybeSingle()
    : { data: null };

  const row = {
    slug: d.slug,
    title_ar: d.title_ar,
    title_fr: d.title_fr ?? null,
    title_en: d.title_en ?? null,
    body_ar: d.body_ar ?? null,
    body_fr: d.body_fr ?? null,
    body_en: d.body_en ?? null,
    seo: d.seo,
    is_published: d.is_published,
    published_at: d.is_published ? (prev?.published_at ?? new Date().toISOString()) : null,
    show_in_footer: d.show_in_footer,
    position: d.position,
    updated_by: staff.id,
  };

  let id = d.id;
  if (id) {
    const { error } = await supabase.from("pages").update(row).eq("id", id);
    if (error) return { ok: false, error: error.code === "23505" ? "slug" : "generic" };
  } else {
    const { data, error } = await supabase.from("pages").insert(row).select("id").single();
    if (error || !data) return { ok: false, error: error?.code === "23505" ? "slug" : "generic" };
    id = data.id as string;
  }

  await audit(staff, d.id ? "page.update" : "page.create", "page", id, {
    slug: d.slug,
    published: d.is_published,
    was_published: prev?.is_published ?? false,
  });
  updateTag("content");
  for (const l of locales) revalidatePath(`/${l}/pages/${d.slug}`);
  revalidatePath(`/${isLocale(lang) ? lang : "ar"}/admin/content`);
  return { ok: true, id };
}
