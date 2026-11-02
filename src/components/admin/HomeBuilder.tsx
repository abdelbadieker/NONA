"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, CopyPlus, Eye, EyeOff, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { locales, type Locale } from "@/i18n/config";
import type { AdminBuilderText } from "@/i18n/admin-builder";
import { publishHome, saveHomeDraft } from "@/lib/actions/builder";
import { newSection, pickText, SECTION_TYPES, type Section, type SectionType } from "@/lib/sections";
import { uploadImage } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { btnPrimary, btnSecondary, inputCls, labelCls } from "./ui";

type Loc = { ar?: string; fr?: string; en?: string };
type AnySection = Section & Record<string, unknown>;

const LOC_FIELDS: Partial<Record<SectionType, { key: string; long?: boolean }[]>> = {
  hero: [{ key: "badge" }, { key: "title" }, { key: "subtitle", long: true }, { key: "cta" }],
  products: [{ key: "title" }],
  categories: [{ key: "title" }],
  banner: [{ key: "alt" }],
  text: [{ key: "title" }, { key: "body", long: true }],
  reviews: [{ key: "title" }],
  faq: [{ key: "title" }],
  newsletter: [{ key: "title" }, { key: "text", long: true }],
};

export function HomeBuilder({
  lang,
  t,
  initial,
  initialToken,
  categories,
  origin,
}: {
  lang: Locale;
  t: AdminBuilderText["builder"];
  initial: Section[];
  initialToken: string | null;
  categories: { slug: string; name: string }[];
  origin: string;
}) {
  const [sections, setSections] = useState<Section[]>(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<Locale>(lang);
  const [addType, setAddType] = useState<SectionType>("products");
  const [dirty, setDirty] = useState(false);
  const [token, setToken] = useState(initialToken);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  function update(next: Section[]) {
    setSections(next);
    setDirty(true);
    setMsg(null);
  }
  const patch = (id: string, p: Record<string, unknown>) =>
    update(sections.map((s) => (s.id === id ? ({ ...s, ...p } as Section) : s)));
  const patchLoc = (id: string, key: string, value: string) => {
    const s = sections.find((x) => x.id === id) as AnySection | undefined;
    if (!s) return;
    patch(id, { [key]: { ...((s[key] as Loc) ?? {}), [tab]: value } });
  };
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const n = [...sections];
    [n[i], n[j]] = [n[j], n[i]];
    update(n);
  }
  function duplicate(i: number) {
    const copy = { ...sections[i], id: Math.random().toString(36).slice(2, 10) } as Section;
    update([...sections.slice(0, i + 1), copy, ...sections.slice(i + 1)]);
  }
  async function upload(id: string, file?: File | null) {
    if (!file) return;
    setUploading(id);
    const r = await uploadImage(file);
    setUploading(null);
    if (r.ok) patch(id, { image: r.url });
    else setMsg({ ok: false, text: r.error });
  }

  function save(kind: "draft" | "preview" | "publish") {
    setMsg(null);
    const win = kind === "preview" ? window.open("about:blank", "_blank") : null;
    start(async () => {
      const r = kind === "publish" ? await publishHome(sections, lang) : await saveHomeDraft(sections, lang);
      if (!r.ok) {
        win?.close();
        setMsg({ ok: false, text: r.error });
        return;
      }
      setDirty(false);
      if (r.token) setToken(r.token);
      setMsg({ ok: true, text: kind === "publish" ? t.published : t.saved });
      if (win && r.token) win.location.href = `${origin}/${lang}/preview/home?token=${r.token}`;
    });
  }

  const summary = (s: Section) => {
    const a = s as AnySection;
    if (s.type === "products") return pickText(a.title as Loc, lang) || t.sources[s.source];
    return pickText((a.title ?? a.alt) as Loc | undefined, lang);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">{t.langHint}</p>
      <ol className="space-y-2">
        {sections.map((s, i) => {
          const a = s as AnySection;
          const isOpen = open === s.id;
          return (
            <li key={s.id} className={cn("rounded-2xl border bg-white", s.enabled ? "border-line" : "border-dashed border-line opacity-60")}>
              <div className="flex items-center gap-1 p-2">
                <span className="w-6 text-center text-xs font-bold text-muted">{i + 1}</span>
                <button type="button" onClick={() => setOpen(isOpen ? null : s.id)} className="min-w-0 flex-1 truncate px-1 text-start text-sm">
                  <span className="font-semibold text-ink">{t.types[s.type]}</span>
                  {summary(s) && <span className="text-muted"> · {summary(s)}</span>}
                </button>
                <button type="button" onClick={() => patch(s.id, { enabled: !s.enabled })} className="grid size-8 place-items-center rounded-lg hover:bg-cream" aria-label={s.enabled ? t.hidden : t.visible} title={s.enabled ? t.visible : t.hidden}>
                  {s.enabled ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
                </button>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="grid size-8 place-items-center rounded-lg hover:bg-cream disabled:opacity-30" aria-label={t.moveUp} title={t.moveUp}>
                  <ArrowUp className="size-4" aria-hidden />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === sections.length - 1} className="grid size-8 place-items-center rounded-lg hover:bg-cream disabled:opacity-30" aria-label={t.moveDown} title={t.moveDown}>
                  <ArrowDown className="size-4" aria-hidden />
                </button>
                <button type="button" onClick={() => duplicate(i)} className="grid size-8 place-items-center rounded-lg hover:bg-cream" aria-label={t.duplicate} title={t.duplicate}>
                  <CopyPlus className="size-4" aria-hidden />
                </button>
                <button type="button" onClick={() => setOpen(isOpen ? null : s.id)} className="grid size-8 place-items-center rounded-lg hover:bg-cream" aria-label={isOpen ? t.close : t.edit} title={isOpen ? t.close : t.edit}>
                  {isOpen ? <X className="size-4" aria-hidden /> : <Pencil className="size-4" aria-hidden />}
                </button>
                <button type="button" onClick={() => update(sections.filter((x) => x.id !== s.id))} className="grid size-8 place-items-center rounded-lg text-red-600 hover:bg-red-50" aria-label={t.remove} title={t.remove}>
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>

              {isOpen && (
                <div className="space-y-3 border-t border-line p-3">
                  {(LOC_FIELDS[s.type] ?? []).length > 0 && (
                    <>
                      <div className="flex gap-1.5" role="tablist">
                        {locales.map((l) => (
                          <button key={l} type="button" role="tab" aria-selected={tab === l} onClick={() => setTab(l)} className={cn("rounded-full border px-3 py-0.5 text-xs font-semibold uppercase", tab === l ? "border-ink bg-ink text-white" : "border-line")}>
                            {l}
                          </button>
                        ))}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2" dir={tab === "ar" ? "rtl" : "ltr"}>
                        {(LOC_FIELDS[s.type] ?? []).map(({ key, long }) => (
                          <label key={key} className={long ? "sm:col-span-2" : undefined}>
                            <span className={labelCls}>{t.fields[key] ?? key}</span>
                            {long ? (
                              <textarea value={((a[key] as Loc) ?? {})[tab] ?? ""} onChange={(e) => patchLoc(s.id, key, e.target.value)} rows={3} className={inputCls} />
                            ) : (
                              <input value={((a[key] as Loc) ?? {})[tab] ?? ""} onChange={(e) => patchLoc(s.id, key, e.target.value)} className={inputCls} />
                            )}
                          </label>
                        ))}
                      </div>
                    </>
                  )}

                  {(s.type === "hero" || s.type === "banner") && (
                    <div className="flex flex-wrap items-center gap-3">
                      {a.image ? (
                        <div className="relative h-16 w-28 overflow-hidden rounded-lg border border-line">
                          <Image src={String(a.image)} alt="" fill sizes="112px" className="object-cover" />
                        </div>
                      ) : null}
                      <label className={cn(btnSecondary, "cursor-pointer")}>
                        <ImagePlus className="size-4" aria-hidden />
                        {uploading === s.id ? "…" : `${t.fields.image}: ${t.upload}`}
                        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" hidden onChange={(e) => upload(s.id, e.target.files?.[0])} />
                      </label>
                      {Boolean(a.image) && (
                        <button type="button" onClick={() => patch(s.id, { image: "" })} className="text-xs text-red-600 hover:underline">
                          {t.remove}
                        </button>
                      )}
                    </div>
                  )}

                  {s.type === "hero" && (
                    <label className="block">
                      <span className={labelCls}>{t.fields.ctaLink}</span>
                      <input value={s.ctaLink} onChange={(e) => patch(s.id, { ctaLink: e.target.value })} placeholder="/shop" dir="ltr" className={inputCls} />
                    </label>
                  )}
                  {s.type === "banner" && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label>
                        <span className={labelCls}>{t.fields.link}</span>
                        <input value={s.link} onChange={(e) => patch(s.id, { link: e.target.value })} placeholder="/shop?category=lingerie" dir="ltr" className={inputCls} />
                      </label>
                      <label className="flex items-center gap-2 pt-6 text-sm">
                        <input type="checkbox" checked={s.rounded} onChange={(e) => patch(s.id, { rounded: e.target.checked })} className="size-4 accent-blush-dark" />
                        {t.fields.rounded}
                      </label>
                    </div>
                  )}
                  {s.type === "products" && (
                    <div className="grid gap-2 sm:grid-cols-3">
                      <label>
                        <span className={labelCls}>{t.fields.source}</span>
                        <select value={s.source} onChange={(e) => patch(s.id, { source: e.target.value })} className={inputCls}>
                          {(["best_sellers", "featured", "new", "category"] as const).map((x) => (
                            <option key={x} value={x}>
                              {t.sources[x]}
                            </option>
                          ))}
                        </select>
                      </label>
                      {s.source === "category" && (
                        <label>
                          <span className={labelCls}>{t.fields.category}</span>
                          <select value={s.category} onChange={(e) => patch(s.id, { category: e.target.value })} className={inputCls}>
                            <option value="">—</option>
                            {categories.map((c) => (
                              <option key={c.slug} value={c.slug}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <label>
                        <span className={labelCls}>{t.fields.limit}</span>
                        <input type="number" min={2} max={24} value={s.limit} onChange={(e) => patch(s.id, { limit: Math.min(24, Math.max(2, Number(e.target.value) || 2)) })} className={inputCls} />
                      </label>
                    </div>
                  )}
                  {s.type === "reviews" && (
                    <label className="block w-32">
                      <span className={labelCls}>{t.fields.limit}</span>
                      <input type="number" min={1} max={12} value={s.limit} onChange={(e) => patch(s.id, { limit: Math.min(12, Math.max(1, Number(e.target.value) || 1)) })} className={inputCls} />
                    </label>
                  )}
                  {s.type === "text" && (
                    <label className="block w-40">
                      <span className={labelCls}>{t.fields.align}</span>
                      <select value={s.align} onChange={(e) => patch(s.id, { align: e.target.value })} className={inputCls}>
                        <option value="center">⟷</option>
                        <option value="start">⇤</option>
                      </select>
                    </label>
                  )}

                  <div className="flex flex-wrap gap-3 border-t border-line pt-3">
                    {(["background", "textColor"] as const).map((k) => (
                      <span key={k} className="flex items-center gap-2 rounded-lg border border-line p-1.5 text-sm">
                        {k === "background" ? t.background : t.textColor}
                        <input type="color" value={s[k] || (k === "background" ? "#ffffff" : "#1a1a1a")} onChange={(e) => patch(s.id, { [k]: e.target.value })} className="size-7 cursor-pointer border-0 bg-transparent p-0" />
                        {s[k] && (
                          <button type="button" onClick={() => patch(s.id, { [k]: "" })} className="text-xs text-muted underline">
                            {t.clear}
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-line bg-white p-3">
        <select value={addType} onChange={(e) => setAddType(e.target.value as SectionType)} className={cn(inputCls, "w-auto")} aria-label={t.add}>
          {SECTION_TYPES.map((x) => (
            <option key={x} value={x}>
              {t.types[x]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            const s = newSection(addType);
            update([...sections, s]);
            setOpen(s.id);
          }}
          className={btnSecondary}
        >
          <Plus className="size-4" aria-hidden />
          {t.add}
        </button>
      </div>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t border-line bg-cream/95 py-3 backdrop-blur">
        {dirty && <span className="text-xs font-medium text-amber-700">{t.unsaved}</span>}
        {msg && <span className={cn("text-sm", msg.ok ? "text-green-700" : "text-red-600")}>{msg.text}</span>}
        <span className="me-auto" />
        {dirty && (
          <button type="button" onClick={() => (setSections(initial), setDirty(false))} className="px-3 text-sm text-muted hover:text-ink">
            {t.reset}
          </button>
        )}
        <button type="button" disabled={pending} onClick={() => save("draft")} className={btnSecondary}>
          {t.saveDraft}
        </button>
        <button type="button" disabled={pending} onClick={() => save("preview")} className={btnSecondary}>
          <Eye className="size-4" aria-hidden />
          {t.preview}
        </button>
        <button type="button" disabled={pending} onClick={() => save("publish")} className={btnPrimary}>
          {t.publish}
        </button>
      </div>
      {token && <span className="sr-only">{token}</span>}
    </div>
  );
}
