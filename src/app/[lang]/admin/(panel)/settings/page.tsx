import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { adminText } from "@/i18n/admin";
import { getAllDeliveryFees, getStoreSettings } from "@/lib/data/admin";
import { getMarketingServer } from "@/lib/data/marketing";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { DeliveryFeesEditor } from "@/components/admin/DeliveryFeesEditor";
import { MarketingForm } from "@/components/admin/MarketingForm";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const t = adminText[lang];
  const [settings, fees, marketing] = await Promise.all([
    getStoreSettings(),
    getAllDeliveryFees(),
    getMarketingServer(),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink">{t.settings.title}</h1>
      <SettingsForm
        lang={lang}
        t={t.settings}
        common={t.common}
        initialStore={settings.store}
        initialSocial={settings.social}
      />
      <MarketingForm
        lang={lang}
        t={t.settings}
        common={t.common}
        initial={marketing}
      />
      <DeliveryFeesEditor
        lang={lang}
        t={t.settings}
        common={t.common}
        fees={fees}
      />
    </div>
  );
}
