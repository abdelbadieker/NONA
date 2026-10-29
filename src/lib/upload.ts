"use client";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "product-images";
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const MAX_BYTES = 8 * 1024 * 1024; // matches the bucket limit (0003_security_hardening)

export type UploadResult = { ok: true; url: string } | { ok: false; error: "type" | "size" | "upload" };

/**
 * Upload directly from the browser to Supabase Storage (no server hop for
 * large files). Storage RLS only allows staff with products/content rights;
 * type and size are checked here for fast feedback and enforced by the bucket.
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  if (!ALLOWED.includes(file.type)) return { ok: false, error: "type" };
  if (file.size > MAX_BYTES) return { ok: false, error: "size" };
  const supabase = createClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (error) return { ok: false, error: "upload" };
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

/** Back-compat helper: URL or null. */
export async function uploadProductImage(file: File): Promise<string | null> {
  const r = await uploadImage(file);
  return r.ok ? r.url : null;
}
