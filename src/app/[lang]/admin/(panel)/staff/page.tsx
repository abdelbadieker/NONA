import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { adminOpsText } from "@/i18n/admin-ops";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getStaffAndRoles } from "@/lib/data/admin-ops";
import { StaffManager } from "@/components/admin/StaffManager";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export default async function StaffPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const ops = adminOpsText[lang];
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "staff.manage")) return <NoAccess t={ops.common} />;
  const data = await getStaffAndRoles();

  return (
    <div className="space-y-5">
      <PageHeader title={ops.staff.title} />
      <StaffManager lang={lang} ops={ops} staff={data.staff} roles={data.roles} selfId={staff.id} />
    </div>
  );
}
