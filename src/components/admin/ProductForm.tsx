"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Upload } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { AdminText } from "@/i18n/admin";
import type { Product, ProductImage, ProductVariant } from "@/lib/types";
import { saveProduct } from "@/lib/actions/products";
import { uploadProductImage } from "@/lib/upload";
import { cn } from "@/lib/utils";

type FormVariant = {
  id?: string;
  size: string;
  color: string;
  color_hex: string;
  stock: string;
  priceOverride: string;
};

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-blush-dark";
const labelCls = "mb-1 block text-sm font-medium text-ink";

export function ProductForm({
  lang,
  t,
  common,
  categories,
  initial,
}: {
  lang: Locale;
  t: AdminText["products"];
  common: AdminText["common"];
  categories: { id: string; name: string }[];
  initial:
    | (Product & { images: ProductImage[]; variants: ProductVariant[] })
    | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [f, setF] = useState({
    nameAr: initial?.name_ar ?? "",
    nameFr: initial?.name_fr ?? "",
    nameEn: initial?.name_en ?? "",
    descAr: initial?.description_ar ?? "",
    slug: initial?.slug ?? "",
    categoryId: initial?.category_id ?? "",
    price: initial ? String(initial.price) : "",
    compareAt: initial?.compare_at_price ? String(initial.compare_at_price) : "",
    deliveryMin: initial?.delivery_days_min ? String(initial.delivery_days_min) : "",
    deliveryMax: initial?.delivery_days_max ? String(initial.delivery_days_max) : "",
    isActive: initial?.is_active ?? true,
    isFeatured: initial?.is_featured ?? false,
    isBestSeller: initial?.is_best_seller ?? false,
  });
  const set = (patch: Partial<typeof f>) => setF((p) => ({ ...p, ...patch }));

  const [images, setImages] = useState<string[]>(
    initial?.images.map((i) => i.url) ?? [],
  );
  const [variants, setVariants] = useState<FormVariant[]>(
    initial?.variants.length
      ? initial.variants.map((v) => ({
          id: v.id,
          size: v.size ?? "",
          color: v.color ?? "",
          color_hex: v.color_hex ?? "",
          stock: String(v.stock),
          priceOverride: v.price_override ? String(v.price_override) : "",
        }))
      : [{ size: "", color: "", color_hex: "", stock: "0", priceOverride: "" }],
  );

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const url = await uploadProductImage(file);
      if (url) urls.push(url);
    }
    setImages((prev) => [...prev, ...urls]);
    setUploading(false);
  }

  function addVariant() {
    setVariants((v) => [
      ...v,
      { size: "", color: "", color_hex: "", stock: "0", priceOverride: "" },
    ]);
  }
  function setVariant(i: number, patch: Partial<FormVariant>) {
    setVariants((v) => v.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveProduct(
        {
          id: initial?.id,
          slug: f.slug.trim(),
          category_id: f.categoryId || null,
          name_ar: f.nameAr.trim(),
          name_fr: f.nameFr.trim() || null,
          name_en: f.nameEn.trim() || null,
          description_ar: f.descAr.trim() || null,
          description_fr: null,
          description_en: null,
          price: Number(f.price) || 0,
          compare_at_price: f.compareAt ? Number(f.compareAt) : null,
          is_active: f.isActive,
          is_featured: f.isFeatured,
          is_best_seller: f.isBestSeller,
          delivery_days_min: f.deliveryMin ? Number(f.deliveryMin) : null,
          delivery_days_max: f.deliveryMax ? Number(f.deliveryMax) : null,
          images,
          variants: variants.map((v) => ({
            id: v.id,
            size: v.size.trim() || null,
            color: v.color.trim() || null,
            color_hex: v.color_hex.trim() || null,
            stock: Number(v.stock) || 0,
            price_override: v.priceOverride ? Number(v.priceOverride) : null,
          })),
        },
        lang,
      );
      if (res.ok) {
        router.push(`/${lang}/admin/products`);
        router.refresh();
      } else {
        setError(res.error === "slug" ? "slug ⚠" : common.cancel + " — " + res.error);
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Basic info */}
      <section className="rounded-2xl border border-line bg-white p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>{t.nameAr}</label>
            <input
              value={f.nameAr}
              onChange={(e) => set({ nameAr: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t.nameFr}</label>
            <input
              value={f.nameFr}
              onChange={(e) => set({ nameFr: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t.nameEn}</label>
            <input
              value={f.nameEn}
              onChange={(e) => set({ nameEn: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t.slug}</label>
            <input
              value={f.slug}
              onChange={(e) => set({ slug: e.target.value })}
              dir="ltr"
              placeholder="robe-soiree"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t.category}</label>
            <select
              value={f.categoryId}
              onChange={(e) => set({ categoryId: e.target.value })}
              className={inputCls}
            >
              <option value="">{t.noCategory}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>{t.description}</label>
            <textarea
              value={f.descAr}
              onChange={(e) => set({ descAr: e.target.value })}
              rows={3}
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* Pricing & flags */}
      <section className="rounded-2xl border border-line bg-white p-4">
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className={labelCls}>{t.price}</label>
            <input
              value={f.price}
              onChange={(e) => set({ price: e.target.value })}
              inputMode="numeric"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t.compareAt}</label>
            <input
              value={f.compareAt}
              onChange={(e) => set({ compareAt: e.target.value })}
              inputMode="numeric"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t.deliveryDays}</label>
            <div className="flex gap-2">
              <input
                value={f.deliveryMin}
                onChange={(e) => set({ deliveryMin: e.target.value })}
                inputMode="numeric"
                className={inputCls}
              />
              <input
                value={f.deliveryMax}
                onChange={(e) => set({ deliveryMax: e.target.value })}
                inputMode="numeric"
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex flex-col justify-center gap-1.5">
            {([
              ["isActive", t.active],
              ["isFeatured", t.featured],
              ["isBestSeller", t.bestSeller],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={f[key]}
                  onChange={(e) => set({ [key]: e.target.checked } as Partial<typeof f>)}
                  className="size-4 accent-blush-dark"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Images */}
      <section className="rounded-2xl border border-line bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">{t.images}</h2>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-cream disabled:opacity-50"
          >
            <Upload className="size-4" aria-hidden />
            {uploading ? common.saving : t.addImage}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          {images.map((url, i) => (
            <div key={url + i} className="relative size-20 overflow-hidden rounded-lg border border-line">
              <Image src={url} alt="" fill sizes="80px" className="object-cover" />
              <button
                type="button"
                onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                className="absolute end-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-black/60 text-white"
                aria-label="remove"
              >
                <Trash2 className="size-3" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Variants */}
      <section className="rounded-2xl border border-line bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">{t.variants}</h2>
          <button
            type="button"
            onClick={addVariant}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-cream"
          >
            <Plus className="size-4" aria-hidden />
            {t.addVariant}
          </button>
        </div>
        <div className="space-y-2">
          {variants.map((v, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg bg-cream p-2">
              <div className="flex-1">
                <label className="text-xs text-muted">{t.size}</label>
                <input value={v.size} onChange={(e) => setVariant(i, { size: e.target.value })} className={inputCls} />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted">{t.color}</label>
                <input value={v.color} onChange={(e) => setVariant(i, { color: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-muted">{t.colorHex}</label>
                <input
                  type="color"
                  value={v.color_hex || "#cccccc"}
                  onChange={(e) => setVariant(i, { color_hex: e.target.value })}
                  className="h-9 w-12 rounded border border-line"
                />
              </div>
              <div className="w-20">
                <label className="text-xs text-muted">{t.stock}</label>
                <input value={v.stock} onChange={(e) => setVariant(i, { stock: e.target.value })} inputMode="numeric" className={inputCls} />
              </div>
              <button
                type="button"
                onClick={() => setVariants((p) => p.filter((_, idx) => idx !== i))}
                className="grid size-9 place-items-center rounded-lg text-red-600 hover:bg-red-50"
                aria-label="remove variant"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? common.saving : common.save}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/${lang}/admin/products`)}
          className={cn("rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink")}
        >
          {common.cancel}
        </button>
      </div>
    </div>
  );
}
