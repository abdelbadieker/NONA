"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from "lucide-react";
import { locales, type Locale } from "@/i18n/config";
import type { AdminText } from "@/i18n/admin";
import type { AdminOpsText } from "@/i18n/admin-ops";
import type { Product, ProductDetailFields, ProductImage, ProductVariant } from "@/lib/types";
import { saveProduct } from "@/lib/actions/products";
import { uploadImage } from "@/lib/upload";
import { cn, formatPrice } from "@/lib/utils";
import { btnPrimary, btnSecondary, inputCls, labelCls } from "./ui";

type FormVariant = {
  id?: string;
  size: string;
  color: string;
  color_hex: string;
  sku: string;
  barcode: string;
  stock: string;
  expected: number | null;
  priceOverride: string;
  cost: string;
  imageUrl: string;
};

type Loc = Record<Locale, string>;
const DETAIL_KEYS = ["material", "fit", "care", "size_guide", "model"] as const;

const toNum = (s: string) => (s.trim() === "" ? null : Number(s));
const hexOrNull = (s: string) => (/^#[0-9a-f]{6}$/i.test(s.trim()) ? s.trim() : null);

export function ProductForm({
  lang,
  t,
  ops,
  common,
  categories,
  initial,
}: {
  lang: Locale;
  t: AdminText["products"];
  ops: AdminOpsText;
  common: AdminText["common"];
  categories: { id: string; name: string }[];
  initial: (Product & { images: ProductImage[]; variants: ProductVariant[] }) | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<Locale>("ar");

  const [f, setF] = useState({
    slug: initial?.slug ?? "",
    categoryId: initial?.category_id ?? "",
    price: initial ? String(initial.price) : "",
    compareAt: initial?.compare_at_price ? String(initial.compare_at_price) : "",
    cost: initial?.cost_price != null ? String(initial.cost_price) : "",
    vendor: initial?.vendor ?? "",
    productType: initial?.product_type ?? "",
    tags: (initial?.tags ?? []).join(", "),
    weight: initial?.weight_grams != null ? String(initial.weight_grams) : "",
    notes: initial?.internal_notes ?? "",
    deliveryMin: initial?.delivery_days_min != null ? String(initial.delivery_days_min) : "",
    deliveryMax: initial?.delivery_days_max != null ? String(initial.delivery_days_max) : "",
    isFeatured: initial?.is_featured ?? false,
    isBestSeller: initial?.is_best_seller ?? false,
  });
  const [names, setNames] = useState<Loc>({
    ar: initial?.name_ar ?? "",
    fr: initial?.name_fr ?? "",
    en: initial?.name_en ?? "",
  });
  const [descs, setDescs] = useState<Loc>({
    ar: initial?.description_ar ?? "",
    fr: initial?.description_fr ?? "",
    en: initial?.description_en ?? "",
  });
  const [seo, setSeo] = useState(() =>
    Object.fromEntries(
      locales.map((l) => [l, { title: initial?.seo?.[l]?.title ?? "", description: initial?.seo?.[l]?.description ?? "" }]),
    ) as Record<Locale, { title: string; description: string }>,
  );
  const [details, setDetails] = useState(() =>
    Object.fromEntries(
      locales.map((l) => [l, Object.fromEntries(DETAIL_KEYS.map((k) => [k, initial?.details?.[l]?.[k] ?? ""]))]),
    ) as Record<Locale, Record<(typeof DETAIL_KEYS)[number], string>>,
  );
  const [images, setImages] = useState<string[]>(initial?.images.map((i) => i.url) ?? []);
  const [variants, setVariants] = useState<FormVariant[]>(
    initial?.variants.length
      ? initial.variants
          .filter((v) => v.is_active)
          .map((v) => ({
            id: v.id,
            size: v.size ?? "",
            color: v.color ?? "",
            color_hex: v.color_hex ?? "",
            sku: v.sku ?? "",
            barcode: v.barcode ?? "",
            stock: String(v.stock),
            expected: v.stock,
            priceOverride: v.price_override != null ? String(v.price_override) : "",
            cost: v.cost_price != null ? String(v.cost_price) : "",
            imageUrl: v.image_url ?? "",
          }))
      : [{ size: "", color: "", color_hex: "", sku: "", barcode: "", stock: "0", expected: null, priceOverride: "", cost: "", imageUrl: "" }],
  );

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const touch = <T,>(setter: (v: T) => void) => (v: T) => {
    setDirty(true);
    setter(v);
  };
  const set = touch((patch: Partial<typeof f>) => setF((p) => ({ ...p, ...patch })));
  const setVariant = (i: number, patch: Partial<FormVariant>) => {
    setDirty(true);
    setVariants((v) => v.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  };

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const r = await uploadImage(file);
      if (r.ok) urls.push(r.url);
      else setError(r.error === "type" ? "JPG, PNG, WEBP, AVIF, GIF" : r.error === "size" ? "≤ 8 MB" : ops.errors.generic);
    }
    if (urls.length) {
      setDirty(true);
      setImages((prev) => [...prev, ...urls].slice(0, 15));
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function moveImage(i: number, dir: -1 | 1) {
    setDirty(true);
    setImages((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const price = Number(f.price) || 0;
  const cost = toNum(f.cost);
  const margin = cost != null && price > 0 ? ((price - cost) / price) * 100 : null;

  function submit(publish: boolean) {
    setError(null);
    startTransition(async () => {
      const cleanLoc = <T extends Record<string, string>>(o: T) =>
        Object.fromEntries(Object.entries(o).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()])) as Partial<T>;
      const res = await saveProduct(
        {
          id: initial?.id,
          slug: f.slug.trim(),
          category_id: f.categoryId || null,
          name_ar: names.ar.trim(),
          name_fr: names.fr.trim() || null,
          name_en: names.en.trim() || null,
          description_ar: descs.ar.trim() || null,
          description_fr: descs.fr.trim() || null,
          description_en: descs.en.trim() || null,
          price,
          compare_at_price: toNum(f.compareAt),
          cost_price: cost,
          vendor: f.vendor.trim() || null,
          product_type: f.productType.trim() || null,
          tags: f.tags.split(",").map((s) => s.trim()).filter(Boolean),
          weight_grams: toNum(f.weight),
          internal_notes: f.notes.trim() || null,
          seo: Object.fromEntries(locales.map((l) => [l, cleanLoc(seo[l])])),
          details: Object.fromEntries(locales.map((l) => [l, cleanLoc(details[l]) as ProductDetailFields])),
          is_active: publish,
          is_featured: f.isFeatured,
          is_best_seller: f.isBestSeller,
          delivery_days_min: toNum(f.deliveryMin),
          delivery_days_max: toNum(f.deliveryMax),
          images,
          variants: variants.map((v) => ({
            id: v.id,
            size: v.size.trim() || null,
            color: v.color.trim() || null,
            color_hex: hexOrNull(v.color_hex),
            sku: v.sku.trim() || null,
            barcode: v.barcode.trim() || null,
            stock: Math.max(0, Math.floor(Number(v.stock) || 0)),
            expected_stock: v.id ? v.expected : null,
            price_override: toNum(v.priceOverride),
            cost_price: toNum(v.cost),
            image_url: v.imageUrl.trim() || null,
          })),
        },
        lang,
      );
      if (res.ok) {
        setDirty(false);
        router.push(`/${lang}/admin/products`);
        router.refresh();
      } else {
        const detail = res.detail ? ` (${res.detail})` : "";
        setError((ops.errors[res.error] ?? ops.errors.generic) + detail);
      }
    });
  }

  const sectionCls = "rounded-2xl border border-line bg-white p-4";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Names & descriptions per language */}
      <section className={sectionCls}>
        <div className="mb-3 flex gap-2" role="tablist">
          {locales.map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={tab === l}
              onClick={() => setTab(l)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-medium uppercase",
                tab === l ? "border-ink bg-ink text-white" : "border-line bg-white text-ink",
              )}
            >
              {l}
              {l === "ar" && " *"}
            </button>
          ))}
        </div>
        <div className="grid gap-4" dir={tab === "ar" ? "rtl" : "ltr"}>
          <label>
            <span className={labelCls}>{tab === "ar" ? t.nameAr : tab === "fr" ? t.nameFr : t.nameEn}</span>
            <input value={names[tab]} onChange={(e) => touch(setNames)({ ...names, [tab]: e.target.value })} maxLength={160} className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>{ops.products.descriptionLang}</span>
            <textarea value={descs[tab]} onChange={(e) => touch(setDescs)({ ...descs, [tab]: e.target.value })} rows={4} maxLength={5000} className={inputCls} />
          </label>
          <fieldset className="rounded-xl border border-line p-3">
            <legend className="px-1 text-sm font-semibold text-ink">{ops.products.details}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {DETAIL_KEYS.map((k) => (
                <label key={k} className={k === "size_guide" ? "sm:col-span-2" : undefined}>
                  <span className={labelCls}>{ops.products[k === "size_guide" ? "sizeGuide" : k]}</span>
                  <textarea
                    value={details[tab][k]}
                    onChange={(e) => touch(setDetails)({ ...details, [tab]: { ...details[tab], [k]: e.target.value } })}
                    rows={k === "size_guide" ? 3 : 2}
                    className={inputCls}
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="rounded-xl border border-line p-3">
            <legend className="px-1 text-sm font-semibold text-ink">{ops.products.seo}</legend>
            <div className="grid gap-3">
              <label>
                <span className={labelCls}>
                  {ops.products.seoTitle} <span className="text-xs text-muted">({seo[tab].title.length}/70)</span>
                </span>
                <input value={seo[tab].title} onChange={(e) => touch(setSeo)({ ...seo, [tab]: { ...seo[tab], title: e.target.value } })} maxLength={70} className={inputCls} />
              </label>
              <label>
                <span className={labelCls}>
                  {ops.products.seoDescription} <span className="text-xs text-muted">({seo[tab].description.length}/170)</span>
                </span>
                <textarea value={seo[tab].description} onChange={(e) => touch(setSeo)({ ...seo, [tab]: { ...seo[tab], description: e.target.value } })} rows={2} maxLength={170} className={inputCls} />
              </label>
            </div>
          </fieldset>
        </div>
      </section>

      {/* Organisation */}
      <section className={sectionCls}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelCls}>{t.slug}</span>
            <input value={f.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase() })} dir="ltr" placeholder="robe-soiree" className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>{t.category}</span>
            <select value={f.categoryId} onChange={(e) => set({ categoryId: e.target.value })} className={inputCls}>
              <option value="">{t.noCategory}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelCls}>{ops.products.vendor}</span>
            <input value={f.vendor} onChange={(e) => set({ vendor: e.target.value })} maxLength={80} className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>{ops.products.productType}</span>
            <input value={f.productType} onChange={(e) => set({ productType: e.target.value })} maxLength={80} className={inputCls} />
          </label>
          <label className="sm:col-span-2">
            <span className={labelCls}>{ops.products.tags}</span>
            <input value={f.tags} onChange={(e) => set({ tags: e.target.value })} className={inputCls} />
          </label>
        </div>
      </section>

      {/* Pricing & logistics */}
      <section className={sectionCls}>
        <div className="grid gap-4 sm:grid-cols-4">
          <label>
            <span className={labelCls}>{t.price}</span>
            <input value={f.price} onChange={(e) => set({ price: e.target.value })} inputMode="decimal" dir="ltr" className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>{t.compareAt}</span>
            <input value={f.compareAt} onChange={(e) => set({ compareAt: e.target.value })} inputMode="decimal" dir="ltr" className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>{ops.products.costPrice}</span>
            <input value={f.cost} onChange={(e) => set({ cost: e.target.value })} inputMode="decimal" dir="ltr" className={inputCls} />
            {margin != null && (
              <span className={cn("mt-1 block text-xs", margin < 0 ? "text-red-600" : "text-muted")}>
                {ops.products.margin}: {margin.toFixed(0)}% ({formatPrice(price - (cost ?? 0))})
              </span>
            )}
          </label>
          <label>
            <span className={labelCls}>{ops.products.weight}</span>
            <input value={f.weight} onChange={(e) => set({ weight: e.target.value })} inputMode="numeric" dir="ltr" className={inputCls} />
          </label>
          <label className="sm:col-span-2">
            <span className={labelCls}>{t.deliveryDays}</span>
            <div className="flex gap-2">
              <input value={f.deliveryMin} onChange={(e) => set({ deliveryMin: e.target.value })} inputMode="numeric" dir="ltr" className={inputCls} />
              <input value={f.deliveryMax} onChange={(e) => set({ deliveryMax: e.target.value })} inputMode="numeric" dir="ltr" className={inputCls} />
            </div>
          </label>
          <div className="flex flex-col justify-center gap-1.5 sm:col-span-2">
            {(
              [
                ["isFeatured", t.featured],
                ["isBestSeller", t.bestSeller],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={f[key]} onChange={(e) => set({ [key]: e.target.checked })} className="size-4 accent-blush-dark" />
                {label}
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Images */}
      <section className={sectionCls}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">{t.images}</h2>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={btnSecondary}>
            <Upload className="size-4" aria-hidden />
            {uploading ? common.saving : t.addImage}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        </div>
        <div className="flex flex-wrap gap-3">
          {images.map((url, i) => (
            <div key={url} className="relative size-24 overflow-hidden rounded-lg border border-line">
              <Image src={url} alt="" fill sizes="96px" className="object-cover" />
              {i === 0 && <span className="absolute start-1 top-1 rounded bg-ink/80 px-1 text-[10px] text-white">1</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-0.5">
                <button type="button" onClick={() => moveImage(i, -1)} aria-label="↑" className="grid size-5 place-items-center text-white">
                  <ArrowUp className="size-3 rtl:-scale-x-100" aria-hidden />
                </button>
                <button type="button" onClick={() => moveImage(i, 1)} aria-label="↓" className="grid size-5 place-items-center text-white">
                  <ArrowDown className="size-3" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDirty(true);
                    setImages((p) => p.filter((_, idx) => idx !== i));
                  }}
                  className="grid size-5 place-items-center text-white"
                  aria-label={common.delete}
                >
                  <Trash2 className="size-3" aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Variants */}
      <section className={sectionCls}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">{t.variants}</h2>
          <button
            type="button"
            onClick={() => {
              setDirty(true);
              setVariants((v) => [
                ...v,
                { size: "", color: "", color_hex: "", sku: "", barcode: "", stock: "0", expected: null, priceOverride: "", cost: "", imageUrl: "" },
              ]);
            }}
            className={btnSecondary}
          >
            <Plus className="size-4" aria-hidden />
            {t.addVariant}
          </button>
        </div>
        <div className="space-y-3">
          {variants.map((v, i) => (
            <div key={v.id ?? `new-${i}`} className="grid grid-cols-2 gap-2 rounded-xl bg-cream p-3 sm:grid-cols-6">
              <label>
                <span className="text-xs text-muted">{t.size}</span>
                <input value={v.size} onChange={(e) => setVariant(i, { size: e.target.value })} maxLength={20} className={inputCls} />
              </label>
              <label>
                <span className="text-xs text-muted">{t.color}</span>
                <input value={v.color} onChange={(e) => setVariant(i, { color: e.target.value })} maxLength={40} className={inputCls} />
              </label>
              <label>
                <span className="text-xs text-muted">{t.colorHex}</span>
                <input type="color" value={hexOrNull(v.color_hex) ?? "#cccccc"} onChange={(e) => setVariant(i, { color_hex: e.target.value })} className="h-9 w-full rounded border border-line" />
              </label>
              <label>
                <span className="text-xs text-muted">{v.id ? t.stock : ops.products.initialStock}</span>
                <input value={v.stock} onChange={(e) => setVariant(i, { stock: e.target.value })} inputMode="numeric" dir="ltr" className={inputCls} />
              </label>
              <label>
                <span className="text-xs text-muted">{ops.products.variantPrice}</span>
                <input value={v.priceOverride} onChange={(e) => setVariant(i, { priceOverride: e.target.value })} inputMode="decimal" dir="ltr" className={inputCls} />
              </label>
              <label>
                <span className="text-xs text-muted">{ops.products.costPrice}</span>
                <input value={v.cost} onChange={(e) => setVariant(i, { cost: e.target.value })} inputMode="decimal" dir="ltr" className={inputCls} />
              </label>
              <label>
                <span className="text-xs text-muted">{ops.products.sku}</span>
                <input value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} maxLength={64} dir="ltr" className={inputCls} />
              </label>
              <label>
                <span className="text-xs text-muted">{ops.products.barcode}</span>
                <input value={v.barcode} onChange={(e) => setVariant(i, { barcode: e.target.value })} maxLength={32} dir="ltr" className={inputCls} />
              </label>
              <label className="col-span-2 sm:col-span-3">
                <span className="text-xs text-muted">{ops.products.variantImage}</span>
                <select value={v.imageUrl} onChange={(e) => setVariant(i, { imageUrl: e.target.value })} className={inputCls}>
                  <option value="">—</option>
                  {images.map((url, n) => (
                    <option key={url} value={url}>
                      #{n + 1}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setDirty(true);
                    setVariants((p) => p.filter((_, idx) => idx !== i));
                  }}
                  disabled={variants.length <= 1}
                  className="grid size-9 place-items-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-30"
                  aria-label={common.delete}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionCls}>
        <label>
          <span className={labelCls}>{ops.products.internalNotes}</span>
          <textarea value={f.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} maxLength={2000} className={inputCls} />
        </label>
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-cream/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <p className="me-auto text-xs text-muted">{ops.products.publishHint}</p>
        {dirty && <span className="text-xs text-amber-700">{ops.common.unsaved}</span>}
        {initial?.is_active && (
          <Link href={`/${lang}/product/${initial.slug}`} target="_blank" className="text-sm text-blush-dark hover:underline">
            {ops.products.preview}
          </Link>
        )}
        <button type="button" onClick={() => submit(false)} disabled={pending} className={btnSecondary}>
          {pending ? common.saving : ops.products.saveDraft}
        </button>
        <button type="button" onClick={() => submit(true)} disabled={pending} className={btnPrimary}>
          {pending ? common.saving : ops.products.savePublish}
        </button>
      </div>
    </div>
  );
}
