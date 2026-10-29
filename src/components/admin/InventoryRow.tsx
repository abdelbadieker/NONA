"use client";

import { useState } from "react";
import { History } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { AdminOpsText } from "@/i18n/admin-ops";
import { adjustStock, setLowStockThreshold } from "@/lib/actions/inventory";
import { INVENTORY_REASONS } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { ActionMessage, useAdminAction } from "./use-action";
import { btnPrimary, inputCls } from "./ui";

export function InventoryAdjust({
  variantId,
  stock,
  threshold,
  lang,
  ops,
  canAdjust,
  historyHref,
}: {
  variantId: string;
  stock: number;
  threshold: number | null;
  lang: Locale;
  ops: AdminOpsText;
  canAdjust: boolean;
  historyHref: string;
}) {
  const { pending, run, msg } = useAdminAction(ops.errors, ops.common.saved);
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState<(typeof INVENTORY_REASONS)[number]>("received");
  const [note, setNote] = useState("");
  const [th, setTh] = useState(threshold == null ? "" : String(threshold));
  const d = Math.trunc(Number(delta));

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <a href={historyHref} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-cream" aria-label={ops.inventory.history} title={ops.inventory.history}>
          <History className="size-4" aria-hidden />
        </a>
        {canAdjust && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="rounded-full border border-line px-3 py-1 text-xs font-medium hover:bg-cream">
            {ops.inventory.adjust}
          </button>
        )}
      </div>
      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!d) return;
            run(() => adjustStock({ variantId, delta: d, reason, note, expected: stock }, lang), () => {
              setDelta("");
              setNote("");
              setOpen(false);
            });
          }}
          className="mt-1 grid w-72 gap-2 rounded-xl border border-line bg-white p-3 text-start shadow-lg"
        >
          <label className="text-xs text-muted">
            {ops.inventory.delta}
            <input value={delta} onChange={(e) => setDelta(e.target.value)} inputMode="numeric" dir="ltr" placeholder="+10 / -2" className={inputCls} autoFocus />
          </label>
          <label className="text-xs text-muted">
            {ops.inventory.reason}
            <select value={reason} onChange={(e) => setReason(e.target.value as typeof reason)} className={inputCls}>
              {INVENTORY_REASONS.map((r) => (
                <option key={r} value={r}>
                  {ops.inventory.reasons[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            {ops.inventory.note}
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className={inputCls} />
          </label>
          {!!d && (
            <p className={cn("text-xs", stock + d < 0 ? "text-red-600" : "text-muted")} dir="ltr">
              {stock} → {stock + d}
            </p>
          )}
          <button type="submit" disabled={pending || !d || stock + d < 0} className={btnPrimary}>
            {pending ? ops.common.saving : ops.common.save}
          </button>
          <div className="flex items-end gap-2 border-t border-line pt-2">
            <label className="flex-1 text-xs text-muted">
              {ops.inventory.threshold}
              <input value={th} onChange={(e) => setTh(e.target.value)} inputMode="numeric" dir="ltr" placeholder={ops.inventory.defaultThreshold} className={inputCls} />
            </label>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setLowStockThreshold(variantId, th.trim() === "" ? null : Number(th), lang))}
              className="rounded-full border border-line px-3 py-2 text-xs hover:bg-cream"
            >
              {ops.common.save}
            </button>
          </div>
        </form>
      )}
      <ActionMessage msg={msg} />
    </div>
  );
}
