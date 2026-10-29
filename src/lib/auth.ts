import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, type Permission } from "@/lib/permissions";
import type { Admin } from "@/lib/types";

/** The verified signed-in user (or null). */
export async function getSessionUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export type Staff = {
  id: string;
  email: string | null;
  fullName: string | null;
  roleKey: string;
  permissions: string[];
};

/**
 * The signed-in, active staff member with their role's permissions, or null.
 * Deduplicated per request. Every Server Action must still call
 * `authorize()` itself — page-level checks don't protect actions.
 */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data } = await supabase
    .from("admins")
    .select("id, email, full_name, role_key, is_active, role:staff_roles(permissions)")
    .eq("id", userData.user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return null;

  const row = data as {
    id: string;
    email: string | null;
    full_name: string | null;
    role_key: string;
    role: { permissions: string[] } | { permissions: string[] }[] | null;
  };
  const role = Array.isArray(row.role) ? row.role[0] : row.role;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    roleKey: row.role_key,
    permissions: role?.permissions ?? [],
  };
});

/** For Server Actions: the staff member if they hold `perm`, else null. */
export async function authorize(perm: Permission): Promise<Staff | null> {
  const staff = await getStaff();
  return staff && can(staff.permissions, perm) ? staff : null;
}

/** For admin pages/layouts: require a signed-in staff member. */
export async function requireStaff(lang: string): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect(`/${lang}/admin/login`);
  return staff;
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
