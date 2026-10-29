"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

/** Header cart icon with a live item count. */
export function CartLink({ href, label, className }: { href: string; label: string; className?: string }) {
  const { count } = useCart();
  return (
    <Link
      href={href}
      aria-label={count ? `${label} (${count})` : label}
      className={cn("relative grid size-9 place-items-center rounded-full text-ink transition-colors hover:bg-blush-light", className)}
    >
      <ShoppingBag className="size-5" aria-hidden />
      {count > 0 && (
        <span className="absolute -end-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-blush-dark px-1 text-[10px] font-bold leading-4 text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
