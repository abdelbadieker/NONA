import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { adminText } from "@/i18n/admin";
import { getHomeContent, getTheme } from "@/lib/data/appearance";
import { AppearanceForm } from "@/components/admin/AppearanceForm";

export default async function AppearancePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const t = adminText[lang];
  const [theme, home] = await Promise.all([getTheme(), getHomeContent()]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink">{t.appearance.title}</h1>
      <AppearanceForm
        lang={lang}
        t={t.appearance}
        common={t.common}
        initialTheme={theme}
        initialHome={home}
      />
    </div>
  );
}
