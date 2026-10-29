import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { storeText } from "@/i18n/store";
import { faq } from "@/lib/content";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return isLocale(lang) ? { title: storeText[lang].pages.faqTitle } : {};
}

export default async function FaqPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const items = faq[lang];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <h1 className="mb-6 text-2xl font-bold text-ink">{storeText[lang].pages.faqTitle}</h1>
      <div className="space-y-3">
        {items.map((i) => (
          <details key={i.q} className="group rounded-2xl border border-line bg-white p-4 open:bg-cream">
            <summary className="cursor-pointer list-none font-semibold text-ink">{i.q}</summary>
            <p className="mt-2 text-sm leading-relaxed text-muted">{i.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
