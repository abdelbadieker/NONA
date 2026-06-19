"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut(lang: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${lang}/admin/login`);
}
