import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="flex min-h-screen flex-col pb-16 md:pb-0">
      <Header lang={lang} dict={dict} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer lang={lang} dict={dict} />
      <BottomNav lang={lang} dict={dict} />
    </div>
  );
}
