"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { deleteProduct, toggleProductActive } from "@/lib/actions/products";

export function ProductRowActions({
  id,
  isActive,
  lang,
  editHref,
  deleteConfirm,
}: {
  id: string;
  isActive: boolean;
  lang: Locale;
  editHref: string;
  deleteConfirm: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <Link
        href={editHref}
        className="grid size-9 place-items-center rounded-lg text-ink hover:bg-cream"
        aria-label="edit"
      >
        <Pencil className="size-4" aria-hidden />
      </Link>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await toggleProductActive(id, !isActive, lang);
            router.refresh();
          })
        }
        className="grid size-9 place-items-center rounded-lg text-ink hover:bg-cream disabled:opacity-50"
        aria-label="toggle"
      >
        {isActive ? (
          <Eye className="size-4" aria-hidden />
        ) : (
          <EyeOff className="size-4 text-muted" aria-hidden />
        )}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(deleteConfirm)) return;
          start(async () => {
            await deleteProduct(id, lang);
            router.refresh();
          });
        }}
        className="grid size-9 place-items-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
        aria-label="delete"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  );
}
