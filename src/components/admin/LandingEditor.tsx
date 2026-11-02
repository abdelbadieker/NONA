"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Copy, ExternalLink, ImagePlus, Trash2, Type } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { AdminBuilderText } from "@/i18n/admin-builder";
import { saveLanding } from "@/lib/actions/landing";
import { DEFAULT_LANDING_FORM, newBlockId, slugify, type LandingBlock, type LandingForm } from "@/lib/landing";
import { uploadImage } from "@/lib/upload";
import { cn, formatPrice } from "@/lib/utils";
import { btnPrimary, btnSecondary, inputCls, labelCls } from "./ui";

type ProductOpt = { id: string; name: string; price: number; image: string | null };
type Initial = {
  id: string;
  title: string;
  slug: string;
  product_id: string | null;
  locale: Locale;
  status: "draft" | "published";
  blocks: LandingBlock[];
  form: LandingForm;
  seo: { title?: string; description?: string };
  preview_token: string;
} | null;

async function imageSize(file: File): Promise<{ width?: number; height?: number }> {
  try {
    const bmp = await createImageBitmap(file);
    const s = { width: bmp.width, height: bmp.height };
    bmp.close();
    return s;
  } catch {
    return {};
  }
}

function Swatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-line p-2 text-sm">
      <span className="text-ink">{label}</span>
      <span className="flex items-center gap-1.5">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-7 cursor-pointer rounded border-0 bg-transparent p-0" />
        <code className="text-xs text-muted" dir="ltr">
          {value}
        </code>
      </span>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-blush-dark" />
      {label}
    </label>
  );
}

export function LandingEditor({
  lang,
  t,
  products,
  initial,
  origin,
}: {
  lang: Locale;
  t: AdminBuilderText["landing"];
  products: ProductOpt[];
  initial: Initial;
  origin: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [productId, setProductId] = useState<string>(initial?.product_id ?? "");
  const [locale, setLocale] = useState<Locale>(initial?.locale ?? "ar");
  const [status, setStatus] = useState<"draft" | "published">(initial?.status ?? "draft");
  const [blocks, setBlocks] = useState<LandingBlock[]>(initial?.blocks ?? [{ id: "form", type: "form" }]);
  const [form, setForm] = useState<LandingForm>(initial?.form ?? DEFAULT_LANDING_FORM);
  const [seo, setSeo] = useState({ title: initial?.seo.title ?? "", description: initial?.seo.description ?? "" });

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const touch = () => setDirty(true);
  const setF = (patch: Partial<LandingForm>) => {
    touch();
    setForm((f) => ({ ...f, ...patch }));
  };
  const product = products.find((p) => p.id === productId);
  const adLink = `${origin}/${locale}/lp/${slug || "…"}`;
  const previewLink = initial ? `${origin}/${locale}/lp/${initial.slug}?preview=${initial.preview_token}` : null;

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    touch();
    setBlocks((b) => {
      const n = [...b];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  }
  function patchBlock(i: number, patch: Partial<LandingBlock>) {
    touch();
    setBlocks((b) => b.map((x, idx) => (idx === i ? ({ ...x, ...patch } as LandingBlock) : x)));
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setMsg(null);
    const added: LandingBlock[] = [];
    for (const file of Array.from(files)) {
      const size = await imageSize(file);
      const r = await uploadImage(file);
      if (r.ok) added.push({ id: newBlockId(), type: "image", url: r.url, ...size });
      else setMsg({ ok: false, text: r.error === "size" ? t.tooBig : r.error === "type" ? t.badType : t.errors.generic });
    }
    if (added.length) {
      touch();
      // New images go just above the order form (the usual ad-page layout).
      setBlocks((b) => {
        const at = b.findIndex((x) => x.type === "form");
        return at < 0 ? [...b, ...added] : [...b.slice(0, at), ...added, ...b.slice(at)];
      });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function save(nextStatus: "draft" | "published") {
    setMsg(null);
    start(async () => {
      const r = await saveLanding(
        {
          id: initial?.id,
          title: title.trim(),
          slug: slug.trim(),
          productId: productId || null,
          locale,
          status: nextStatus,
          blocks,
          form,
          seo,
        },
        lang,
      );
      if (r.ok) {
        setStatus(nextStatus);
        setDirty(false);
        setMsg({ ok: true, text: t.saved });
        if (!initial) router.replace(`/${lang}/admin/landing/${r.id}`);
        else router.refresh();
      } else {
        setMsg({ ok: false, text: t.errors[r.error] ?? t.errors.generic });
      }
    });
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(text);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const section = "space-y-3 rounded-2xl border border-line bg-white p-4";

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
      <div className="space-y-5">
        {/* Basics */}
        <section className={section}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className={labelCls}>{t.pageTitle}</span>
              <input
                value={title}
                onChange={(e) => {
                  touch();
                  setTitle(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                maxLength={120}
                className={inputCls}
              />
            </label>
            <label>
              <span className={labelCls}>{t.slug}</span>
              <input
                value={slug}
                onChange={(e) => {
                  touch();
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"));
                }}
                dir="ltr"
                maxLength={80}
                className={inputCls}
              />
            </label>
            <label>
              <span className={labelCls}>{t.product}</span>
              <select
                value={productId}
                onChange={(e) => {
                  touch();
                  setProductId(e.target.value);
                  const p = products.find((x) => x.id === e.target.value);
                  if (p && !title) {
                    setTitle(p.name);
                    if (!slugTouched) setSlug(slugify(p.name));
                  }
                }}
                className={inputCls}
              >
                <option value="">{t.chooseProduct}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatPrice(p.price)} DA
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelCls}>{t.language}</span>
              <select value={locale} onChange={(e) => (touch(), setLocale(e.target.value as Locale))} className={inputCls}>
                <option value="ar">العربية</option>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
          <div className="space-y-2 rounded-xl bg-cream p-3 text-sm">
            <p className="font-semibold text-ink">{t.adLink}</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1.5 text-xs" dir="ltr">
                {adLink}
              </code>
              <button type="button" onClick={() => copy(adLink)} disabled={!slug} className={btnSecondary}>
                <Copy className="size-4" aria-hidden />
                {copied === adLink ? t.copied : t.copyLink}
              </button>
            </div>
            {previewLink && status === "draft" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">{t.previewLink}</span>
                <a href={previewLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-blush-dark hover:underline">
                  <ExternalLink className="size-3.5" aria-hidden />
                  {t.preview}
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Blocks */}
        <section className={section}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">{t.blocks}</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={btnSecondary}>
                <ImagePlus className="size-4" aria-hidden />
                {uploading ? t.uploading : t.uploadImages}
              </button>
              <button
                type="button"
                onClick={() => {
                  touch();
                  setBlocks((b) => [...b, { id: newBlockId(), type: "text", text: "", align: "center", size: "md", color: "", background: "" }]);
                }}
                className={btnSecondary}
              >
                <Type className="size-4" aria-hidden />
                {t.addText}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple hidden onChange={(e) => onFiles(e.target.files)} />
            </div>
          </div>
          <ol className="space-y-2">
            {blocks.map((b, i) => (
              <li key={b.id} className={cn("rounded-xl border p-2", b.type === "form" ? "border-blush-dark bg-blush-light/40" : "border-line")}>
                <div className="flex items-center gap-2">
                  <span className="w-6 text-center text-xs font-bold text-muted">{i + 1}</span>
                  {b.type === "image" ? (
                    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-cream">
                      <Image src={b.url} alt="" fill sizes="40px" className="object-cover" />
                    </div>
                  ) : null}
                  <span className="flex-1 text-sm font-medium text-ink">
                    {b.type === "image" ? t.imageBlock : b.type === "text" ? t.textBlock : t.formBlock}
                  </span>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t.moveUp} title={t.moveUp} className="grid size-8 place-items-center rounded-lg hover:bg-cream disabled:opacity-30">
                    <ArrowUp className="size-4" aria-hidden />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label={t.moveDown} title={t.moveDown} className="grid size-8 place-items-center rounded-lg hover:bg-cream disabled:opacity-30">
                    <ArrowDown className="size-4" aria-hidden />
                  </button>
                  {b.type !== "form" && (
                    <button
                      type="button"
                      onClick={() => (touch(), setBlocks((x) => x.filter((_, idx) => idx !== i)))}
                      aria-label={t.remove}
                      title={t.remove}
                      className="grid size-8 place-items-center rounded-lg text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
                {b.type === "image" && (
                  <input value={b.alt ?? ""} onChange={(e) => patchBlock(i, { alt: e.target.value })} placeholder={t.alt} maxLength={200} className={cn(inputCls, "mt-2")} />
                )}
                {b.type === "text" && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-4">
                    <textarea value={b.text} onChange={(e) => patchBlock(i, { text: e.target.value })} placeholder={t.text} rows={2} maxLength={2000} className={cn(inputCls, "sm:col-span-4")} />
                    <select value={b.size} onChange={(e) => patchBlock(i, { size: e.target.value as "md" })} aria-label={t.textSize} className={inputCls}>
                      {(["sm", "md", "lg", "xl"] as const).map((s) => (
                        <option key={s} value={s}>
                          {t.textSize}: {s.toUpperCase()}
                        </option>
                      ))}
                    </select>
                    <select value={b.align} onChange={(e) => patchBlock(i, { align: e.target.value as "center" })} aria-label={t.align} className={inputCls}>
                      <option value="center">{t.center}</option>
                      <option value="start">{t.start}</option>
                    </select>
                    <Swatch label={t.textColor} value={b.color || "#1a1a1a"} onChange={(v) => patchBlock(i, { color: v })} />
                    <Swatch label={t.background} value={b.background || "#ffffff"} onChange={(v) => patchBlock(i, { background: v })} />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* Form design */}
        <section className={section}>
          <h2 className="text-sm font-semibold text-ink">{t.formDesign}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className={labelCls}>{t.heading}</span>
              <input value={form.heading} onChange={(e) => setF({ heading: e.target.value })} maxLength={120} className={inputCls} />
            </label>
            <label>
              <span className={labelCls}>{t.buttonText}</span>
              <input value={form.buttonText} onChange={(e) => setF({ buttonText: e.target.value })} maxLength={60} className={inputCls} />
            </label>
            <label>
              <span className={labelCls}>{t.buttonSize}</span>
              <select value={form.buttonSize} onChange={(e) => setF({ buttonSize: e.target.value as LandingForm["buttonSize"] })} className={inputCls}>
                {(["md", "lg", "xl"] as const).map((s) => (
                  <option key={s} value={s}>
                    {t.sizes[s]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelCls}>{t.buttonShape}</span>
              <select value={form.buttonShape} onChange={(e) => setF({ buttonShape: e.target.value as LandingForm["buttonShape"] })} className={inputCls}>
                {(["pill", "rounded", "square"] as const).map((s) => (
                  <option key={s} value={s}>
                    {t.shapes[s]}
                  </option>
                ))}
              </select>
            </label>
            <Swatch label={t.buttonColor} value={form.buttonColor} onChange={(v) => setF({ buttonColor: v })} />
            <Swatch label={t.buttonTextColor} value={form.buttonTextColor} onChange={(v) => setF({ buttonTextColor: v })} />
            <Swatch label={t.accent} value={form.accentColor} onChange={(v) => setF({ accentColor: v })} />
            <Swatch label={t.formBg} value={form.formBackground} onChange={(v) => setF({ formBackground: v })} />
            <Swatch label={t.pageBg} value={form.pageBackground} onChange={(v) => setF({ pageBackground: v })} />
          </div>
          <p className="pt-2 text-sm font-semibold text-ink">{t.fields}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Toggle label={t.showPrice} checked={form.showPrice} onChange={(v) => setF({ showPrice: v })} />
            <Toggle label={t.showQuantity} checked={form.showQuantity} onChange={(v) => setF({ showQuantity: v })} />
            <Toggle label={t.showPhone2} checked={form.showPhone2} onChange={(v) => setF({ showPhone2: v })} />
            <Toggle label={t.showCommune} checked={form.showCommune} onChange={(v) => setF({ showCommune: v })} />
            <Toggle label={t.showNotes} checked={form.showNotes} onChange={(v) => setF({ showNotes: v })} />
            <Toggle label={t.animate} checked={form.animateButton} onChange={(v) => setF({ animateButton: v })} />
            <Toggle label={t.showHeader} checked={form.showHeader} onChange={(v) => setF({ showHeader: v })} />
            <Toggle label={t.stickyCta} checked={form.stickyCta} onChange={(v) => setF({ stickyCta: v })} />
          </div>
          {form.stickyCta && (
            <label className="block">
              <span className={labelCls}>{t.stickyText}</span>
              <input value={form.stickyText} onChange={(e) => setF({ stickyText: e.target.value })} maxLength={60} className={inputCls} />
            </label>
          )}
        </section>

        {/* SEO */}
        <section className={section}>
          <h2 className="text-sm font-semibold text-ink">{t.seo}</h2>
          <input value={seo.title} onChange={(e) => (touch(), setSeo({ ...seo, title: e.target.value }))} placeholder={t.seoTitle} maxLength={70} className={inputCls} />
          <textarea value={seo.description} onChange={(e) => (touch(), setSeo({ ...seo, description: e.target.value }))} placeholder={t.seoDescription} rows={2} maxLength={170} className={inputCls} />
        </section>

        {/* Save bar */}
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-line bg-cream/95 py-3 backdrop-blur">
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", status === "published" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800")}>
            {t.status[status]}
          </span>
          {msg && <span className={cn("text-sm", msg.ok ? "text-green-700" : "text-red-600")}>{msg.text}</span>}
          <span className="me-auto" />
          {status === "published" ? (
            <button type="button" disabled={pending} onClick={() => save("draft")} className={btnSecondary}>
              {t.unpublish}
            </button>
          ) : (
            <button type="button" disabled={pending} onClick={() => save("draft")} className={btnSecondary}>
              {t.saveDraft}
            </button>
          )}
          <button type="button" disabled={pending || !productId} onClick={() => save("published")} className={btnPrimary}>
            {t.publish}
          </button>
        </div>
      </div>

      {/* Live preview (phone width) */}
      <aside className="xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)]">
        <p className="mb-2 text-xs font-semibold text-muted">{t.livePreview}</p>
        <div className="mx-auto h-[720px] w-[375px] max-w-full overflow-y-auto rounded-[2rem] border-8 border-ink shadow-xl xl:h-[calc(100%-1.5rem)]" style={{ backgroundColor: form.pageBackground }} dir={locale === "ar" ? "rtl" : "ltr"}>
          {form.showHeader && <p className="py-2 text-center text-lg font-bold text-ink">NONA</p>}
          {blocks.map((b) =>
            b.type === "image" ? (
              <Image key={b.id} src={b.url} alt="" width={b.width ?? 1080} height={b.height ?? 1350} sizes="360px" className="block h-auto w-full" />
            ) : b.type === "text" ? (
              <p
                key={b.id}
                className={cn("whitespace-pre-line px-4 py-3", b.align === "center" && "text-center", b.size === "lg" && "text-lg font-semibold", b.size === "xl" && "text-xl font-bold", b.size === "sm" && "text-sm")}
                style={{ color: b.color || undefined, backgroundColor: b.background || undefined }}
              >
                {b.text || "…"}
              </p>
            ) : (
              <div key={b.id} className="space-y-2 p-4" style={{ backgroundColor: form.formBackground }}>
                {form.heading && <p className="text-center font-bold text-ink">{form.heading}</p>}
                {form.showPrice && product && <p className="text-center text-xl font-extrabold text-ink">{formatPrice(product.price)} DA</p>}
                {!product && <p className="rounded-lg bg-amber-50 p-2 text-center text-xs text-amber-800">{t.noProduct}</p>}
                {["", "", ""].map((_, n) => (
                  <div key={n} className="h-10 rounded-lg border border-line bg-white" />
                ))}
                <div
                  className={cn(
                    "w-full text-center font-bold shadow",
                    form.buttonSize === "md" ? "py-3" : form.buttonSize === "lg" ? "py-4 text-lg" : "py-5 text-xl",
                    form.buttonShape === "pill" ? "rounded-full" : form.buttonShape === "rounded" ? "rounded-xl" : "rounded-none",
                    form.animateButton && "animate-cta",
                  )}
                  style={{ backgroundColor: form.buttonColor, color: form.buttonTextColor }}
                >
                  {form.buttonText || "اطلبيه الآن"}
                </div>
              </div>
            ),
          )}
        </div>
      </aside>
    </div>
  );
}
