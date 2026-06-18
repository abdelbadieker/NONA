import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ar";
import type { ProductCardData } from "@/lib/data/catalog";
import { cn, formatPrice, interpolate, pickLocale } from "@/lib/utils";
import { WishlistButton } from "./WishlistButton";

const LOW_STOCK = 5;

export function ProductCard({
  product,
  lang,
  dict,
}: {
  product: ProductCardData;
  lang: Locale;
  dict: Dictionary;
}) {
  const name = pickLocale(product, "name", lang);
  const href = `/${lang}/product/${product.slug}`;
  const img = product.images?.[0]?.url;
  const soldOut = product.total_stock <= 0;
  const low = !soldOut && product.total_stock <= LOW_STOCK;
  const hasDiscount =
    product.compare_at_price != null && product.compare_at_price > product.price;
  const off = hasDiscount
    ? Math.round((1 - product.price / product.compare_at_price!) * 100)
    : 0;

  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-blush-light">
        {img && (
          <Image
            src={img}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, 220px"
            className={cn(
              "object-cover transition duration-500 group-hover:scale-105",
              soldOut && "opacity-60",
            )}
          />
        )}

        <div className="absolute start-2 top-2 flex flex-col gap-1">
          {product.is_best_seller && (
            <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-semibold text-white">
              {dict.product.bestSeller}
            </span>
          )}
          {hasDiscount && (
            <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">
              -{off}%
            </span>
          )}
        </div>

        <WishlistButton
          productId={product.id}
          label={dict.product.addToWishlist}
          className="absolute end-2 top-2 size-8 bg-white/80 backdrop-blur hover:bg-white"
        />

        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-ink/80 py-1 text-center text-xs font-medium text-white">
            {dict.product.soldOut}
          </span>
        )}
        {low && (
          <span className="absolute inset-x-0 bottom-0 bg-blush-dark/90 py-1 text-center text-xs font-medium text-white">
            {interpolate(dict.product.onlyLeft, { count: product.total_stock })}
          </span>
        )}
      </div>

      <h3 className="mt-2 line-clamp-1 text-sm font-medium text-ink">{name}</h3>
      <div className="mt-0.5 flex items-center gap-2">
        <span className="text-sm font-bold text-ink">
          {formatPrice(product.price)} {dict.common.currency}
        </span>
        {hasDiscount && (
          <span className="text-xs text-muted line-through">
            {formatPrice(product.compare_at_price!)}
          </span>
        )}
      </div>
    </Link>
  );
}
