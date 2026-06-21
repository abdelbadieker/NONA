import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { adminText } from "@/i18n/admin";
import { getAllReasons } from "@/lib/data/admin";
import { ReasonManager } from "@/components/admin/ReasonManager";

export default async function ReasonsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const t = adminText[lang];
  const [cancellation, returns] = await Promise.all([
    getAllReasons("cancellation"),
    getAllReasons("return"),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink">{t.reasons.title}</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <ReasonManager
          kind="cancellation"
          title={t.reasons.cancellation}
          reasons={cancellation}
          lang={lang}
          t={t.reasons}
        />
        <ReasonManager
          kind="return"
          title={t.reasons.returns}
          reasons={returns}
          lang={lang}
          t={t.reasons}
        />
      </div>
    </div>
  );
}
