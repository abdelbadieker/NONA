"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, Trash2, Upload } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";
import type { AdminText } from "@/i18n/admin";
import {
  DEFAULT_THEME,
  type HeroLocale,
  type Theme,
} from "@/lib/appearance-types";
import { saveAppearance } from "@/lib/actions/admin-config";
import { uploadProductImage } from "@/lib/upload";
import { cn, darkenHex } from "@/lib/utils";

type HomeInit = {
  heroImage?: string;
  ar: HeroLocale;
  fr: HeroLocale;
  en: HeroLocale;
};

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-blush-dark";

export function AppearanceForm({
  lang,
  t,
  common,
  initialTheme,
  initialHome,
}: {
  lang: Locale;
  t: AdminText["appearance"];
  common: AdminText["common"];
  initialTheme: Theme;
  initialHome: HomeInit;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [colors, setColors] = useState({
    blush: initialTheme.blush,
    gold: initialTheme.gold,
    ink: initialTheme.ink,
    background: initialTheme.background,
  });
  const [heroImage, setHeroImage] = useState(initialHome.heroImage ?? "");
  const [content, setContent] = useState<Record<string, HeroLocale>>({
    ar: { ...initialHome.ar },
    fr: { ...initialHome.fr },
    en: { ...initialHome.en },
  });
  const [tab, setTab] = useState<Locale>(lang);

  const setColor = (k: keyof typeof colors, v: string) =>
    setColors((c) => ({ ...c, [k]: v }));
  const setField = (k: keyof HeroLocale, v: string) =>
    setContent((c) => ({ ...c, [tab]: { ...c[tab], [k]: v } }));

  async function onFile(file?: File | null) {
    if (!file) return;
    setUploading(true);
    const url = await uploadProductImage(file);
    if (url) setHeroImage(url);
    setUploading(false);
  }

  function save() {
    setSaved(false);
    start(async () => {
      const res = await saveAppearance(
        {
          theme: {
            blush: colors.blush,
            blushDark: darkenHex(colors.blush, 0.16),
            gold: colors.gold,
            ink: colors.ink,
            background: colors.background,
          },
          home: {
            heroImage,
            ar: content.ar,
            fr: content.fr,
            en: content.en,
          },
        },
        lang,
      );
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    });
  }

  const colorRows: [keyof typeof colors, string][] = [
    ["blush", t.blush],
    ["gold", t.gold],
    ["ink", t.ink],
    ["background", t.background],
  ];

  const fields: [keyof HeroLocale, string][] = [
    ["badge", t.badge],
    ["title", t.heroTitle],
    ["subtitle", t.subtitle],
    ["cta", t.cta],
    ["announcement", t.announcement],
  ];

  return (
    <div className="space-y-5">
      {/* Colors */}
      <section className="rounded-2xl border border-line bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-ink">{t.colors}</h2>
          <button
            type="button"
            onClick={() =>
              setColors({
                blush: DEFAULT_THEME.blush,
                gold: DEFAULT_THEME.gold,
                ink: DEFAULT_THEME.ink,
                background: DEFAULT_THEME.background,
              })
            }
            className="text-sm text-blush-dark hover:underline"
          >
            {t.reset}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {colorRows.map(([k, label]) => (
            <label key={k} className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                {label}
              </span>
              <div className="flex items-center gap-2 rounded-lg border border-line p-1.5">
                <input
                  type="color"
                  value={colors[k]}
                  onChange={(e) => setColor(k, e.target.value)}
                  className="size-8 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <input
                  value={colors[k]}
                  onChange={(e) => setColor(k, e.target.value)}
                  dir="ltr"
                  className="w-full min-w-0 bg-transparent text-xs text-ink outline-none"
                />
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Hero */}
      <section className="rounded-2xl border border-line bg-white p-4">
        <h2 className="mb-3 font-semibold text-ink">{t.hero}</h2>

        <div className="mb-4">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            {t.heroImage}
          </span>
          <div className="flex items-center gap-3">
            {heroImage ? (
              <div className="relative size-20 overflow-hidden rounded-lg border border-line">
                <Image src={heroImage} alt="" fill sizes="80px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => setHeroImage("")}
                  className="absolute end-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-black/60 text-white"
                  aria-label={t.remove}
                >
                  <Trash2 className="size-3" aria-hidden />
                </button>
              </div>
            ) : (
              <div className="size-20 rounded-lg border border-dashed border-line bg-cream" />
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-cream disabled:opacity-50"
            >
              <Upload className="size-4" aria-hidden />
              {uploading ? common.saving : t.uploadImage}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </div>
        </div>

        <span className="mb-1.5 block text-sm font-medium text-ink">
          {t.perLang}
        </span>
        <div className="mb-3 flex gap-2">
          {locales.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setTab(l)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-medium uppercase",
                tab === l
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-white text-ink",
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <p className="mb-3 text-xs text-muted">{t.hint}</p>
        <div className="space-y-3">
          {fields.map(([k, label]) => (
            <label key={k} className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                {label}
              </span>
              {k === "subtitle" ? (
                <textarea
                  value={content[tab][k] ?? ""}
                  onChange={(e) => setField(k, e.target.value)}
                  rows={2}
                  className={inputCls}
                />
              ) : (
                <input
                  value={content[tab][k] ?? ""}
                  onChange={(e) => setField(k, e.target.value)}
                  className={inputCls}
                />
              )}
            </label>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? common.saving : common.save}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check className="size-4" aria-hidden />
            {common.save}
          </span>
        )}
      </div>
    </div>
  );
}
