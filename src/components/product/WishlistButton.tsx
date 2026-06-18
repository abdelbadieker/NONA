"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist";
import { cn } from "@/lib/utils";

export function WishlistButton({
  productId,
  label,
  className,
}: {
  productId: string;
  label: string;
  className?: string;
}) {
  const { has, toggle } = useWishlist();
  const active = has(productId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        "grid place-items-center rounded-full transition-colors",
        className,
      )}
    >
      <Heart
        className={cn(
          "size-5 transition-all",
          active ? "fill-blush-dark text-blush-dark" : "text-ink",
        )}
        aria-hidden
      />
    </button>
  );
}
