import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { storeText } from "@/i18n/store";
import { getMarketingPublic } from "@/lib/data/marketing";
import { getStoreSettings } from "@/lib/data/admin";
import { getHomeContent } from "@/lib/data/appearance";
import { getFooterPages } from "@/lib/data/content";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { MetaPixel } from "@/components/marketing/MetaPixel";
import { TikTokPixel } from "@/components/marketing/TikTokPixel";
import { GoogleAnalytics } from "@/components/marketing/GoogleAnalytics";
import { UtmCapture } from "@/components/marketing/UtmCapture";
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

  const [dict, marketing, settings, home, pages] = await Promise.all([
    getDictionary(lang),
    getMarketingPublic(),
    getStoreSettings(),
    getHomeContent(),
    getFooterPages(),
  ]);
  const st = storeText[lang];
  const announcement = home[lang]?.announcement;

  return (
    <div className="flex min-h-screen flex-col pb-16 md:pb-0">
      {announcement && (
        <div className="bg-ink px-4 py-2 text-center text-sm font-medium text-white">{announcement}</div>
      )}
      <Header lang={lang} dict={dict} st={st} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer
        lang={lang}
        dict={dict}
        st={st}
        pages={pages}
        store={settings.store}
        social={settings.social}
      />
      <BottomNav lang={lang} dict={dict} cartLabel={st.nav.cart} />
      <WhatsAppButton phone={settings.social.whatsapp ?? ""} />
      <UtmCapture />
      {marketing.metaPixelId && <MetaPixel pixelId={marketing.metaPixelId} />}
      {marketing.tiktokPixelId && <TikTokPixel pixelId={marketing.tiktokPixelId} />}
      {marketing.ga4Id && <GoogleAnalytics measurementId={marketing.ga4Id} />}
    </div>
  );
}
