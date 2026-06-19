import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { adminText } from "@/i18n/admin";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminPanelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const admin = await requireAdmin(lang);
  const t = adminText[lang];

  return (
    <AdminShell
      lang={lang}
      nav={t.nav}
      adminName={admin.full_name ?? admin.email ?? ""}
    >
      {children}
    </AdminShell>
  );
}
