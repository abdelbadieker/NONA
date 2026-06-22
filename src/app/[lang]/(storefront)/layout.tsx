import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getMarketingPublic } from "@/lib/data/marketing";
import { getStoreSettings } from "@/lib/data/admin";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { MetaPixel } from "@/components/marketing/MetaPixel";
import { TikTokPixel } from "@/components/marketing/TikTokPixel";
import { WhatsAppButton } from "@/components/marketing/WhatsAppButton";

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, marketing, settings] = await Promise.all([
    getDictionary(lang),
    getMarketingPublic(),
    getStoreSettings(),
  ]);

  return (
    <div className="flex min-h-screen flex-col pb-16 md:pb-0">
      <Header lang={lang} dict={dict} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer lang={lang} dict={dict} store={settings.store} social={settings.social} />
      <BottomNav lang={lang} dict={dict} />
      <WhatsAppButton phone={settings.social.whatsapp ?? ""} />
      {marketing.metaPixelId && <MetaPixel pixelId={marketing.metaPixelId} />}
      {marketing.tiktokPixelId && (
        <TikTokPixel pixelId={marketing.tiktokPixelId} />
      )}
    </div>
  );
}
