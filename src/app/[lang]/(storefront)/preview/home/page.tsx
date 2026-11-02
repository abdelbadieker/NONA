import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getHomeDraft } from "@/lib/data/sections";
import { SectionsRenderer } from "@/components/home/SectionsRenderer";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Private preview of the unpublished homepage (needs the draft's token). */
export default async function HomeDraftPreview({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { token } = await searchParams;
  const draft = await getHomeDraft();
  if (!token || !draft.token || token !== draft.token) notFound();
  const dict = await getDictionary(lang);
  return (
    <>
      <div className="sticky top-16 z-30 bg-amber-500 px-4 py-1.5 text-center text-xs font-bold text-white">
        {lang === "ar" ? "معاينة المسودة — غير منشورة" : lang === "fr" ? "Aperçu du brouillon — non publié" : "Draft preview — not published"}
      </div>
      <SectionsRenderer sections={draft.sections} lang={lang} dict={dict} />
    </>
  );
}
