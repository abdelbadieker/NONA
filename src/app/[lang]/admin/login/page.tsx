import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { adminText } from "@/i18n/admin";
import { getAdmin } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const admin = await getAdmin();
  if (admin) redirect(`/${lang}/admin`);

  const t = adminText[lang].login;

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-1 text-2xl font-bold text-ink">
            NONA
            <span className="mb-2 size-1.5 rounded-full bg-gold" aria-hidden />
          </div>
          <h1 className="mt-2 text-lg font-semibold text-ink">{t.title}</h1>
          <p className="mt-1 text-sm text-muted">{t.subtitle}</p>
        </div>
        <LoginForm lang={lang} t={t} />
      </div>
    </div>
  );
}
