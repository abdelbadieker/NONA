import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { adminText } from "@/i18n/admin";
import { adminOpsText } from "@/i18n/admin-ops";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getAllDeliveryFees, getStoreSettings } from "@/lib/data/admin";
import { getDeliverySettings } from "@/lib/data/catalog";
import { getMarketingAdmin } from "@/lib/data/marketing";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { DeliveryFeesEditor } from "@/components/admin/DeliveryFeesEditor";
import { MarketingForm } from "@/components/admin/MarketingForm";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export default async function AdminSettingsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = adminText[lang];
  const ops = adminOpsText[lang];
  const staff = await requireStaff(lang);
  const canSettings = can(staff.permissions, "settings.manage");
  const canMarketing = can(staff.permissions, "marketing.manage");
  if (!canSettings && !canMarketing) return <NoAccess t={ops.common} />;

  const [settings, fees, marketing, delivery] = await Promise.all([
    getStoreSettings(),
    canSettings ? getAllDeliveryFees() : Promise.resolve([]),
    getMarketingAdmin(),
    getDeliverySettings(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title={t.settings.title} />
      {canSettings && (
        <SettingsForm lang={lang} t={t.settings} common={t.common} initialStore={settings.store} initialSocial={settings.social} />
      )}
      {canMarketing && <MarketingForm lang={lang} t={t.settings} ops={ops} initial={marketing} />}
      {canSettings && <DeliveryFeesEditor lang={lang} t={t.settings} ops={ops} fees={fees} settings={delivery} />}
    </div>
  );
}
