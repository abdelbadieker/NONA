"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Copy, Pencil, Trash2 } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { AdminOpsText } from "@/i18n/admin-ops";
import type { ProductListRow } from "@/lib/data/admin-ops";
import {
  archiveProduct,
  bulkAdjustPrice,
  bulkUpdateProducts,
  deleteProduct,
  duplicateProduct,
  restoreProduct,
  type BulkAction,
} from "@/lib/actions/products";
import { cn, formatPrice, interpolate, pickLocale } from "@/lib/utils";
import { ActionMessage, useAdminAction } from "./use-action";
import { Badge, btnSecondary, inputCls } from "./ui";

const statusTone = { active: "green", draft: "amber", archived: "neutral" } as const;

export function ProductTable({
  rows,
  lang,
  ops,
  stockLabel,
  canManage,
  currency,
}: {
  rows: ProductListRow[];
  lang: Locale;
  ops: AdminOpsText;
  stockLabel: string;
  canManage: boolean;
  currency: string;
}) {
  const router = useRouter();
  const { pending, run, msg } = useAdminAction(ops.errors, ops.common.saved);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [percent, setPercent] = useState("");
  const base = `/${lang}/admin/products`;
  const all = rows.length > 0 && selected.size === rows.length;

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function bulk(action: BulkAction) {
    run(() => bulkUpdateProducts([...selected], action, lang), () => setSelected(new Set()));
  }

  return (
    <div className="space-y-3">
      {canManage && selected.size > 0 && (
        <div className="sticky top-14 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-3 shadow-sm lg:top-2">
          <span className="text-sm font-medium text-ink">{interpolate(ops.common.selected, { count: selected.size })}</span>
          {(["publish", "unpublish", "feature", "unfeature", "archive", "restore"] as BulkAction[]).map((a) => (
            <button key={a} type="button" disabled={pending} onClick={() => bulk(a)} className={cn(btnSecondary, "px-3 py-1 text-xs")}>
              {ops.products.bulk[a]}
            </button>
          ))}
          <span className="flex items-center gap-1">
            <input
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              placeholder="%"
              aria-label={ops.products.bulkPrice}
              title={ops.products.bulkPriceHint}
              dir="ltr"
              className={cn(inputCls, "w-20 py-1 text-xs")}
            />
            <button
              type="button"
              disabled={pending || !Number(percent)}
              onClick={() => {
                if (confirm(`${ops.products.bulkPrice}: ${percent}% × ${selected.size}?`))
                  run(() => bulkAdjustPrice([...selected], Number(percent), lang), () => setPercent(""));
              }}
              className={cn(btnSecondary, "px-3 py-1 text-xs")}
            >
              {ops.products.bulkPrice}
            </button>
          </span>
          <ActionMessage msg={msg} />
        </div>
      )}
      {selected.size === 0 && <ActionMessage msg={msg} />}

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {canManage && (
          <label className="flex items-center gap-2 border-b border-line px-4 py-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={all}
              onChange={() => setSelected(all ? new Set() : new Set(rows.map((r) => r.id)))}
              className="size-4 accent-blush-dark"
            />
            {ops.common.all}
          </label>
        )}
        <ul className="divide-y divide-line">
          {rows.map((p) => (
            <li key={p.id} className={cn("flex items-center gap-3 px-4 py-3", p.status !== "active" && "bg-cream/40")}>
              {canManage && (
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                  aria-label={pickLocale(p, "name", lang)}
                  className="size-4 shrink-0 accent-blush-dark"
                />
              )}
              <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-blush-light">
                {p.image && <Image src={p.image} alt="" fill sizes="48px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`${base}/${p.id}`} className="block truncate text-sm font-medium text-ink hover:underline">
                  {pickLocale(p, "name", lang)}
                </Link>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  <span>
                    {formatPrice(Number(p.price))} {currency}
                  </span>
                  <span className={cn(p.total_stock <= 0 && "font-semibold text-red-600")}>
                    {stockLabel}: {p.total_stock}
                  </span>
                  <Badge tone={statusTone[p.status]}>{ops.products.status[p.status]}</Badge>
                  {p.is_featured && <Badge tone="purple">★</Badge>}
                </p>
              </div>
              {canManage && (
                <div className="flex shrink-0 items-center gap-0.5">
                  <Link href={`${base}/${p.id}`} className="grid size-9 place-items-center rounded-lg hover:bg-cream" aria-label={ops.common.edit}>
                    <Pencil className="size-4" aria-hidden />
                  </Link>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => duplicateProduct(p.id, lang), (r) => r.id && router.push(`${base}/${r.id}`))}
                    className="grid size-9 place-items-center rounded-lg hover:bg-cream disabled:opacity-50"
                    aria-label={ops.products.duplicate}
                    title={ops.products.duplicate}
                  >
                    <Copy className="size-4" aria-hidden />
                  </button>
                  {p.status === "archived" ? (
                    <>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => restoreProduct(p.id, lang))}
                        className="grid size-9 place-items-center rounded-lg hover:bg-cream disabled:opacity-50"
                        aria-label={ops.products.restore}
                        title={ops.products.restore}
                      >
                        <ArchiveRestore className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          if (confirm(`${ops.products.deleteForever}?`)) run(() => deleteProduct(p.id, lang));
                        }}
                        className="grid size-9 place-items-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                        aria-label={ops.products.deleteForever}
                        title={ops.products.deleteForever}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (confirm(`${ops.products.archive}?`)) run(() => archiveProduct(p.id, lang));
                      }}
                      className="grid size-9 place-items-center rounded-lg hover:bg-cream disabled:opacity-50"
                      aria-label={ops.products.archive}
                      title={ops.products.archive}
                    >
                      <Archive className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
