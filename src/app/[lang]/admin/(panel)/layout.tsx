import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { adminText } from "@/i18n/admin";
import { adminOpsText } from "@/i18n/admin-ops";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { pickLocale } from "@/lib/utils";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminPanelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const staff = await requireStaff(lang);
  const supabase = await createClient();
  const { data: role } = await supabase
    .from("staff_roles")
    .select("name_ar, name_fr, name_en")
    .eq("key", staff.roleKey)
    .maybeSingle();

  return (
    <AdminShell
      lang={lang}
      nav={adminText[lang].nav}
      ops={adminOpsText[lang].nav}
      adminName={staff.fullName ?? staff.email ?? ""}
      roleLabel={role ? pickLocale(role, "name", lang) : staff.roleKey}
      permissions={staff.permissions}
    >
      {children}
    </AdminShell>
  );
}
