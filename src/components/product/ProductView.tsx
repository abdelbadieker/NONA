"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ar";
import type { StoreText } from "@/i18n/store";
import type { ProductVariant } from "@/lib/types";
import { ProductGallery } from "./ProductGallery";
import { ProductPurchase } from "./ProductPurchase";

/** Gallery + purchase box; picking a color shows that color's image. */
export function ProductView({
  images,
  name,
  children,
  ...purchase
}: {
  images: { url: string; alt?: string }[];
  name: string;
  productId: string;
  basePrice: number;
  comparePrice: number | null;
  currency: string;
  variants: ProductVariant[];
  lang: Locale;
  dict: Dictionary;
  cartText: StoreText["cart"];
  children?: React.ReactNode;
}) {
  const [focus, setFocus] = useState<string | null>(null);
  const all = focus && !images.some((i) => i.url === focus) ? [{ url: focus }, ...images] : images;
  const index = focus ? Math.max(0, all.findIndex((i) => i.url === focus)) : 0;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <ProductGallery key={focus ?? "default"} images={all} alt={name} initialIndex={index} />
      <div>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{name}</h1>
        <div className="mt-5">
          <ProductPurchase {...purchase} onVariantImage={setFocus} />
        </div>
        {children}
      </div>
    </div>
  );
}
