import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { getPublishedPage } from "@/lib/data/content";
import { SITE_URL } from "@/lib/site";
import { pickLocale } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const page = await getPublishedPage(slug);
  if (!page) return {};
  const seo = page.seo?.[lang] ?? {};
  return {
    title: seo.title || pickLocale(page, "title", lang),
    description: seo.description || undefined,
    alternates: {
      canonical: `${SITE_URL}/${lang}/pages/${page.slug}`,
      languages: Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}/pages/${page.slug}`])),
    },
  };
}

/** CMS page. Bodies are plain text — rendered as escaped paragraphs, never HTML. */
export default async function CmsPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const page = await getPublishedPage(slug);
  if (!page) notFound();

  const title = pickLocale(page, "title", lang);
  const body = pickLocale(page, "body", lang);

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-ink">{title}</h1>
      <div className="space-y-4 text-sm leading-relaxed text-ink">
        {body
          .split(/\n{2,}/)
          .filter((p) => p.trim())
          .map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
      </div>
    </article>
  );
}
