import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { storeText } from "@/i18n/store";
import { getStoreSettings } from "@/lib/data/admin";
import { ContactForm } from "@/components/forms/ContactForm";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return isLocale(lang) ? { title: storeText[lang].pages.contactTitle } : {};
}

export default async function ContactPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const st = storeText[lang];
  const { store, social } = await getStoreSettings();
  const wa = (social.whatsapp ?? "").replace(/\D/g, "");

  const channels = [
    store.phone && { href: `tel:${store.phone.replace(/\s/g, "")}`, label: st.pages.call, value: store.phone, Icon: Phone },
    wa && { href: `https://wa.me/${wa}`, label: st.pages.whatsapp, value: `+${wa}`, Icon: MessageCircle },
    store.email && { href: `mailto:${store.email}`, label: st.pages.email, value: store.email, Icon: Mail },
  ].filter(Boolean) as { href: string; label: string; value: string; Icon: typeof Phone }[];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold text-ink">{st.pages.contactTitle}</h1>
      <p className="mb-6 text-sm text-muted">{st.pages.contactIntro}</p>
      {channels.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {channels.map(({ href, label, value, Icon }) => (
            <a
              key={href}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 hover:bg-cream"
            >
              <Icon className="size-5 text-blush-dark" aria-hidden />
              <span>
                <span className="block text-xs text-muted">{label}</span>
                <span className="block text-sm font-medium text-ink" dir="ltr">
                  {value}
                </span>
              </span>
            </a>
          ))}
        </div>
      )}
      <ContactForm lang={lang} t={st.forms} />
    </div>
  );
}
