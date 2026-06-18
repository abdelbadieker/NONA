"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ar";
import type { ProductVariant } from "@/lib/types";
import { cn, formatPrice, interpolate } from "@/lib/utils";
import { WishlistButton } from "./WishlistButton";

const LOW = 5;

export function ProductPurchase({
  productId,
  slug,
  basePrice,
  comparePrice,
  currency,
  variants,
  lang,
  dict,
}: {
  productId: string;
  slug: string;
  basePrice: number;
  comparePrice: number | null;
  currency: string;
  variants: ProductVariant[];
  lang: Locale;
  dict: Dictionary;
}) {
  const router = useRouter();
  const active = useMemo(() => variants.filter((v) => v.is_active), [variants]);

  const sizes = useMemo(
    () => [...new Set(active.map((v) => v.size).filter((s): s is string => !!s))],
    [active],
  );
  const colors = useMemo(() => {
    const map = new Map<string, string | null>();
    active.forEach((v) => {
      if (v.color) map.set(v.color, v.color_hex ?? null);
    });
    return [...map.entries()].map(([color, hex]) => ({ color, hex }));
  }, [active]);

  const [size, setSize] = useState<string | null>(
    sizes.length === 1 ? sizes[0] : null,
  );
  const [color, setColor] = useState<string | null>(
    colors.length === 1 ? colors[0].color : null,
  );
  const [qty, setQty] = useState(1);

  const variant = useMemo(
    () =>
      active.find(
        (v) =>
          (sizes.length ? v.size === size : v.size == null) &&
          (colors.length ? v.color === color : v.color == null),
      ) ?? (sizes.length === 0 && colors.length === 0 ? active[0] : undefined),
    [active, size, color, sizes, colors],
  );

  const stock = variant?.stock ?? 0;
  const price = variant?.price_override ?? basePrice;
  const hasDiscount = comparePrice != null && comparePrice > price;
  const needsSize = sizes.length > 0 && !size;
  const needsColor = colors.length > 0 && !color;
  const maxQty = Math.max(1, stock);
  const q = Math.min(qty, maxQty);
  const canOrder = !!variant && stock > 0 && !needsSize && !needsColor;

  function order() {
    if (!canOrder || !variant) return;
    const params = new URLSearchParams({
      product: slug,
      variant: variant.id,
      qty: String(q),
    });
    router.push(`/${lang}/checkout?${params.toString()}`);
  }

  const ctaLabel = needsSize
    ? dict.product.chooseSize
    : needsColor
      ? dict.product.chooseColor
      : !variant || stock <= 0
        ? dict.product.soldOut
        : dict.product.orderNow;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold text-ink">
          {formatPrice(price)} {currency}
        </span>
        {hasDiscount && (
          <span className="text-base text-muted line-through">
            {formatPrice(comparePrice!)}
          </span>
        )}
      </div>

      {sizes.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-medium text-ink">
            {dict.product.size}
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const avail = active.some(
                (v) =>
                  v.size === s &&
                  (color ? v.color === color : true) &&
                  v.stock > 0,
              );
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={cn(
                    "min-w-11 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    size === s
                      ? "border-blush-dark bg-blush-dark text-white"
                      : "border-line bg-white text-ink hover:border-blush-dark",
                    !avail && "opacity-40",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {colors.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-medium text-ink">
            {dict.product.color}
            {color ? `: ${color}` : ""}
          </div>
          <div className="flex flex-wrap gap-2">
            {colors.map(({ color: c, hex }) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                title={c}
                className={cn(
                  "size-9 rounded-full border-2 p-0.5 transition-colors",
                  color === c ? "border-blush-dark" : "border-line",
                )}
              >
                <span
                  className="block size-full rounded-full border border-black/10"
                  style={{ backgroundColor: hex ?? "#cccccc" }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {variant && (
        <div className="text-sm">
          {stock <= 0 ? (
            <span className="font-medium text-red-600">
              {dict.product.soldOut}
            </span>
          ) : stock <= LOW ? (
            <span className="font-medium text-blush-dark">
              {interpolate(dict.product.onlyLeft, { count: stock })}
            </span>
          ) : (
            <span className="font-medium text-green-600">
              ✓ {dict.product.inStock}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-ink">
          {dict.product.quantity}
        </span>
        <div className="flex items-center rounded-lg border border-line">
          <button
            type="button"
            onClick={() => setQty(Math.max(1, q - 1))}
            disabled={q <= 1}
            aria-label="-"
            className="grid size-9 place-items-center text-ink disabled:opacity-30"
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <span className="w-8 text-center text-sm font-semibold">{q}</span>
          <button
            type="button"
            onClick={() => setQty(Math.min(maxQty, q + 1))}
            disabled={q >= maxQty}
            aria-label="+"
            className="grid size-9 place-items-center text-ink disabled:opacity-30"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={order}
          disabled={!canOrder}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-4 text-base font-semibold transition-transform",
            canOrder
              ? "bg-ink text-white hover:scale-[1.01]"
              : "cursor-not-allowed bg-line text-muted",
          )}
        >
          <ShoppingBag className="size-5" aria-hidden />
          {ctaLabel}
        </button>
        <WishlistButton
          productId={productId}
          label={dict.product.addToWishlist}
          className="size-12 shrink-0 border border-line hover:bg-blush-light"
        />
      </div>
    </div>
  );
}
