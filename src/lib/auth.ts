import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Admin } from "@/lib/types";

/** The verified signed-in user (or null). */
export async function getSessionUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/** The current admin row if the signed-in user is an active admin, else null. */
export async function getAdmin(): Promise<Admin | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data } = await supabase
    .from("admins")
    .select("*")
    .eq("id", userData.user.id)
    .eq("is_active", true)
    .maybeSingle();

  return (data as Admin | null) ?? null;
}

/** Require an active admin; redirect to the login page otherwise. */
export async function requireAdmin(lang: string): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect(`/${lang}/admin/login`);
  return admin;
}
