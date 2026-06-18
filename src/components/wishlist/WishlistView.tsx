"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ar";
import type { ProductCardData } from "@/lib/data/catalog";
import { createClient } from "@/lib/supabase/client";
import { useWishlist } from "@/lib/wishlist";
import { ProductCard } from "@/components/product/ProductCard";

const FIELDS =
  "id, slug, name_ar, name_fr, name_en, price, compare_at_price, currency, total_stock, is_best_seller, is_featured, created_at, category_id, images:product_images(url, position)";

export function WishlistView({
  lang,
  dict,
}: {
  lang: Locale;
  dict: Dictionary;
}) {
  const { ids, ready } = useWishlist();
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!ids.length) {
      setProducts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("products")
        .select(FIELDS)
        .in("id", ids)
        .eq("is_active", true);
      if (cancelled) return;
      const list = ((data as ProductCardData[] | null) ?? []).map((p) => ({
        ...p,
        images: [...(p.images ?? [])].sort((a, b) => a.position - b.position),
      }));
      const byId = new Map(list.map((p) => [p.id, p]));
      setProducts(
        ids.map((id) => byId.get(id)).filter((p): p is ProductCardData => !!p),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [ids, ready]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[3/4] w-full animate-pulse rounded-xl bg-blush-light" />
            <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-blush-light" />
          </div>
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <Heart className="size-12 text-blush" aria-hidden />
        <p className="text-muted">{dict.shop.empty}</p>
        <Link
          href={`/${lang}/shop`}
          className="rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-white"
        >
          {dict.product.backToShop}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} lang={lang} dict={dict} />
      ))}
    </div>
  );
}
