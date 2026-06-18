import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { cairo, inter } from "@/lib/fonts";
import { locales, isLocale, getDirection } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import "../globals.css";

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: { default: dict.meta.title, template: "%s | NONA" },
    description: dict.meta.description,
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dir = getDirection(lang);
  const dict = await getDictionary(lang);

  return (
    <html
      lang={lang}
      dir={dir}
      className={`${cairo.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background pb-16 text-foreground md:pb-0">
        <Header lang={lang} dict={dict} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer lang={lang} dict={dict} />
        <BottomNav lang={lang} dict={dict} />
        <Analytics />
      </body>
    </html>
  );
}
