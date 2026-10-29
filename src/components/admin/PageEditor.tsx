"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";
import type { AdminOpsText } from "@/i18n/admin-ops";
import { savePage } from "@/lib/actions/content";
import { cn } from "@/lib/utils";
import { ActionMessage, useAdminAction } from "./use-action";
import { btnPrimary, btnSecondary, inputCls, labelCls } from "./ui";

type Loc = Record<Locale, string>;

export function PageEditor({ lang, ops, initial }: { lang: Locale; ops: AdminOpsText; initial: Record<string, unknown> | null }) {
  const router = useRouter();
  const t = ops.content;
  const { pending, run, msg } = useAdminAction(ops.errors, ops.common.saved);
  const [tab, setTab] = useState<Locale>("ar");
  const [slug, setSlug] = useState(String(initial?.slug ?? ""));
  const [titles, setTitles] = useState<Loc>({
    ar: String(initial?.title_ar ?? ""),
    fr: String(initial?.title_fr ?? ""),
    en: String(initial?.title_en ?? ""),
  });
  const [bodies, setBodies] = useState<Loc>({
    ar: String(initial?.body_ar ?? ""),
    fr: String(initial?.body_fr ?? ""),
    en: String(initial?.body_en ?? ""),
  });
  const seoInit = (initial?.seo ?? {}) as Record<string, { title?: string; description?: string }>;
  const [seo, setSeo] = useState(
    Object.fromEntries(locales.map((l) => [l, { title: seoInit[l]?.title ?? "", description: seoInit[l]?.description ?? "" }])) as Record<
      Locale,
      { title: string; description: string }
    >,
  );
  const [footer, setFooter] = useState(initial ? Boolean(initial.show_in_footer) : true);
  const [position, setPosition] = useState(String(initial?.position ?? 0));

  function save(publish: boolean) {
    run(
      () =>
        savePage(
          {
            id: initial?.id as string | undefined,
            slug: slug.trim(),
            title_ar: titles.ar.trim(),
            title_fr: titles.fr.trim() || null,
            title_en: titles.en.trim() || null,
            body_ar: bodies.ar || null,
            body_fr: bodies.fr || null,
            body_en: bodies.en || null,
            seo: Object.fromEntries(
              locales.map((l) => [l, Object.fromEntries(Object.entries(seo[l]).filter(([, v]) => v.trim()))]),
            ),
            is_published: publish,
            show_in_footer: footer,
            position: Number(position) || 0,
          },
          lang,
        ),
      (r) => {
        if ("id" in r && !initial) router.push(`/${lang}/admin/content/${r.id}`);
      },
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <p className="rounded-xl bg-amber-50 px-4 py-2 text-xs text-amber-800">{t.reviewNote}</p>
      <section className="grid gap-4 rounded-2xl border border-line bg-white p-4 sm:grid-cols-3">
        <label className="sm:col-span-2">
          <span className={labelCls}>{t.slug}</span>
          <div className="flex items-center gap-1 text-sm text-muted" dir="ltr">
            /{lang}/pages/
            <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} className={inputCls} placeholder="returns" />
          </div>
        </label>
        <label>
          <span className={labelCls}>{t.position}</span>
          <input value={position} onChange={(e) => setPosition(e.target.value)} inputMode="numeric" dir="ltr" className={inputCls} />
        </label>
        <label className="flex items-center gap-2 text-sm text-ink sm:col-span-3">
          <input type="checkbox" checked={footer} onChange={(e) => setFooter(e.target.checked)} className="size-4 accent-blush-dark" />
          {t.showInFooter}
        </label>
      </section>

      <section className="rounded-2xl border border-line bg-white p-4">
        <div className="mb-3 flex gap-2" role="tablist">
          {locales.map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={tab === l}
              onClick={() => setTab(l)}
              className={cn("rounded-full border px-3 py-1 text-sm font-medium uppercase", tab === l ? "border-ink bg-ink text-white" : "border-line")}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="space-y-3" dir={tab === "ar" ? "rtl" : "ltr"}>
          <label className="block">
            <span className={labelCls}>{t.titleField}</span>
            <input value={titles[tab]} onChange={(e) => setTitles({ ...titles, [tab]: e.target.value })} maxLength={120} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>{t.body}</span>
            <textarea value={bodies[tab]} onChange={(e) => setBodies({ ...bodies, [tab]: e.target.value })} rows={12} maxLength={20000} className={inputCls} />
            <span className="mt-1 block text-xs text-muted">{t.bodyHint}</span>
          </label>
          <label className="block">
            <span className={labelCls}>{ops.products.seoTitle}</span>
            <input value={seo[tab].title} onChange={(e) => setSeo({ ...seo, [tab]: { ...seo[tab], title: e.target.value } })} maxLength={70} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>{ops.products.seoDescription}</span>
            <textarea value={seo[tab].description} onChange={(e) => setSeo({ ...seo, [tab]: { ...seo[tab], description: e.target.value } })} rows={2} maxLength={170} className={inputCls} />
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending} onClick={() => save(false)} className={btnSecondary}>
          {ops.products.saveDraft}
        </button>
        <button type="button" disabled={pending} onClick={() => save(true)} className={btnPrimary}>
          {ops.products.savePublish}
        </button>
        {Boolean(initial?.is_published) && (
          <Link href={`/${lang}/pages/${String(initial?.slug)}`} target="_blank" className="text-sm text-blush-dark hover:underline">
            {t.view}
          </Link>
        )}
        <ActionMessage msg={msg} />
      </div>
    </div>
  );
}
