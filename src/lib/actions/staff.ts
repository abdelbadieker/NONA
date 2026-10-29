"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorize } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { roleInputSchema, staffInviteSchema, staffUpdateSchema } from "@/lib/validation";
import { isLocale } from "@/i18n/config";

type Result = { ok: true } | { ok: false; error: string };
const FULL_ACCESS_ROLES = ["owner", "admin"];

function revalidateStaff(lang: string) {
  revalidatePath(`/${isLocale(lang) ? lang : "ar"}/admin/staff`);
}

/** How many active accounts hold a full-access role (excluding `exceptId`). */
async function fullAccessCount(exceptId?: string) {
  const supabase = createAdminClient();
  let q = supabase
    .from("admins")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .in("role_key", FULL_ACCESS_ROLES);
  if (exceptId) q = q.neq("id", exceptId);
  const { count } = await q;
  return count ?? 0;
}

export async function updateStaffMember(
  input: { id: string; roleKey: string; isActive: boolean; fullName?: string },
  lang: string,
): Promise<Result> {
  const staff = await authorize("staff.manage");
  if (!staff) return { ok: false, error: "auth" };
  const parsed = staffUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const d = parsed.data;

  const supabase = createAdminClient();
  const { data: target } = await supabase.from("admins").select("role_key, is_active").eq("id", d.id).maybeSingle();
  if (!target) return { ok: false, error: "not_found" };

  // Only full-access staff may grant/revoke full access.
  const touchesFullAccess = FULL_ACCESS_ROLES.includes(d.roleKey) || FULL_ACCESS_ROLES.includes(target.role_key);
  if (touchesFullAccess && !FULL_ACCESS_ROLES.includes(staff.roleKey)) return { ok: false, error: "forbidden" };

  // Never leave the store without an active owner/admin.
  const losesFullAccess =
    FULL_ACCESS_ROLES.includes(target.role_key) &&
    target.is_active &&
    (!d.isActive || !FULL_ACCESS_ROLES.includes(d.roleKey));
  if (losesFullAccess && (await fullAccessCount(d.id)) === 0) return { ok: false, error: "last_admin" };

  const { error } = await supabase
    .from("admins")
    .update({ role_key: d.roleKey, is_active: d.isActive, full_name: d.fullName || null })
    .eq("id", d.id);
  if (error) return { ok: false, error: error.code === "23503" ? "unknown_role" : "generic" };

  await audit(staff, "staff.update", "admin", d.id, {
    from_role: target.role_key,
    to_role: d.roleKey,
    active: d.isActive,
  });
  revalidateStaff(lang);
  return { ok: true };
}

/**
 * Grant panel access to an EXISTING account (created in Supabase Auth or with
 * scripts/db/create-admin.mjs). Account creation itself is not done here.
 */
export async function addStaffMember(
  input: { email: string; fullName?: string; roleKey: string },
  lang: string,
): Promise<Result> {
  const staff = await authorize("staff.manage");
  if (!staff) return { ok: false, error: "auth" };
  const parsed = staffInviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const d = parsed.data;
  if (FULL_ACCESS_ROLES.includes(d.roleKey) && !FULL_ACCESS_ROLES.includes(staff.roleKey)) {
    return { ok: false, error: "forbidden" };
  }

  const supabase = createAdminClient();
  let userId: string | undefined;
  for (let page = 1; page <= 20 && !userId; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return { ok: false, error: "generic" };
    userId = data.users.find((u) => u.email?.toLowerCase() === d.email)?.id;
    if (data.users.length < 200) break;
  }
  if (!userId) return { ok: false, error: "no_account" };

  const { error } = await supabase.from("admins").upsert({
    id: userId,
    email: d.email,
    full_name: d.fullName || null,
    role_key: d.roleKey,
    is_active: true,
  });
  if (error) return { ok: false, error: error.code === "23503" ? "unknown_role" : "generic" };
  await audit(staff, "staff.add", "admin", userId, { role: d.roleKey });
  revalidateStaff(lang);
  return { ok: true };
}

/** Create or edit a custom role. System roles (owner, admin…) are fixed. */
export async function saveRole(
  input: { key: string; name_ar: string; name_fr?: string | null; name_en?: string | null; permissions: string[] },
  lang: string,
): Promise<Result> {
  const staff = await authorize("staff.manage");
  if (!staff) return { ok: false, error: "auth" };
  const parsed = roleInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const d = parsed.data;

  const supabase = createAdminClient();
  const { data: existing } = await supabase.from("staff_roles").select("is_system").eq("key", d.key).maybeSingle();
  if (existing?.is_system) return { ok: false, error: "system_role" };

  const { error } = await supabase.from("staff_roles").upsert({
    key: d.key,
    name_ar: d.name_ar,
    name_fr: d.name_fr ?? null,
    name_en: d.name_en ?? null,
    permissions: [...new Set(d.permissions)],
    is_system: false,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "generic" };
  await audit(staff, existing ? "role.update" : "role.create", "staff_role", d.key, {
    permissions: d.permissions,
  });
  revalidateStaff(lang);
  return { ok: true };
}
