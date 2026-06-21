"use client";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "product-images";

/** Upload an image to the product-images bucket; returns its public URL. */
export async function uploadProductImage(file: File): Promise<string | null> {
  const supabase = createClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) return null;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
