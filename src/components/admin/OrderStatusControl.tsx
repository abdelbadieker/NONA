"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { AdminText } from "@/i18n/admin";
import type { AdminOpsText } from "@/i18n/admin-ops";
import type { OrderStatus } from "@/lib/types";
import { setOrderStatus } from "@/lib/actions/orders";
import { ORDER_TRANSITIONS } from "@/lib/order-status";
import { cn, pickLocale } from "@/lib/utils";
import { ActionMessage, useAdminAction } from "./use-action";
import { inputCls } from "./ui";

type Reason = { id: string; label_ar: string; label_fr: string | null; label_en: string | null };

const tone: Record<OrderStatus, string> = {
  not_confirmed: "border-line text-ink hover:bg-cream",
  confirmed: "border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100",
  in_delivery: "border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100",
  delivered: "border-green-300 bg-green-50 text-green-800 hover:bg-green-100",
  returned: "border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100",
  canceled: "border-red-300 bg-red-50 text-red-700 hover:bg-red-100",
};

/** Offers only the transitions the database will accept from the current status. */
export function OrderStatusControl({
  orderId,
  current,
  lang,
  t,
  ops,
  statusLabels,
  cancellationReasons,
  returnReasons,
  canManage,
}: {
  orderId: string;
  current: OrderStatus;
  lang: Locale;
  t: AdminText["orders"];
  ops: AdminOpsText;
  statusLabels: AdminText["status"];
  cancellationReasons: Reason[];
  returnReasons: Reason[];
  canManage: boolean;
}) {
  const { pending, run, msg } = useAdminAction({ ...ops.errors, stock: t.errStock }, t.updated);
  const [target, setTarget] = useState<OrderStatus | null>(null);
  const [reasonId, setReasonId] = useState("");
  const next = ORDER_TRANSITIONS[current];
  const needsReason = target === "canceled" || target === "returned";
  const reasons = target === "canceled" ? cancellationReasons : target === "returned" ? returnReasons : [];

  function apply(status: OrderStatus) {
    run(() => setOrderStatus({ orderId, status, reasonId: reasonId || null, lang }), () => {
      setTarget(null);
      setReasonId("");
    });
  }

  if (!canManage) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted">{next.length ? ops.orders.allowedNext : ops.orders.noTransitions}</p>
      <div className="flex flex-wrap gap-2">
        {next.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            onClick={() => (s === "canceled" || s === "returned" ? setTarget(s) : apply(s))}
            className={cn("rounded-full border px-4 py-1.5 text-sm font-semibold disabled:opacity-50", tone[s])}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>

      {target && needsReason && (
        <div className="space-y-2 rounded-xl border border-line bg-cream p-3" role="group">
          <label className="block text-sm font-medium text-ink">
            {t.selectReason}
            <select value={reasonId} onChange={(e) => setReasonId(e.target.value)} className={cn(inputCls, "mt-1")}>
              <option value="">—</option>
              {reasons.map((r) => (
                <option key={r.id} value={r.id}>
                  {pickLocale(r, "label", lang)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => apply(target)}
              className={cn("rounded-full border px-4 py-1.5 text-sm font-semibold disabled:opacity-50", tone[target])}
            >
              {ops.common.confirm}: {statusLabels[target]}
            </button>
            <button type="button" onClick={() => setTarget(null)} className="px-3 text-sm text-muted">
              {ops.common.cancel}
            </button>
          </div>
        </div>
      )}
      <ActionMessage msg={msg} />
    </div>
  );
}
