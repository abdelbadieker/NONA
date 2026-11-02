import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getHomeSections } from "@/lib/data/sections";
import { SectionsRenderer } from "@/components/home/SectionsRenderer";

/** Homepage = the published section layout from Admin → Homepage builder. */
export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [dict, sections] = await Promise.all([getDictionary(lang), getHomeSections()]);
  return <SectionsRenderer sections={sections} lang={lang} dict={dict} />;
}
