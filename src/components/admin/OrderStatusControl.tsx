"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { AdminText } from "@/i18n/admin";
import type { OrderStatus } from "@/lib/types";
import { updateOrderStatus } from "@/lib/actions/orders";
import { cn, pickLocale } from "@/lib/utils";

const STATUSES: OrderStatus[] = [
  "not_confirmed",
  "confirmed",
  "in_delivery",
  "delivered",
  "returned",
  "canceled",
];

type Reason = {
  id: string;
  label_ar: string;
  label_fr: string | null;
  label_en: string | null;
};

export function OrderStatusControl({
  orderId,
  current,
  lang,
  t,
  statusLabels,
  cancellationReasons,
  returnReasons,
}: {
  orderId: string;
  current: OrderStatus;
  lang: Locale;
  t: AdminText["orders"];
  statusLabels: AdminText["status"];
  cancellationReasons: Reason[];
  returnReasons: Reason[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(current);
  const [reasonId, setReasonId] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const needsReason = status === "canceled" || status === "returned";
  const reasons =
    status === "canceled"
      ? cancellationReasons
      : status === "returned"
        ? returnReasons
        : [];

  function apply() {
    setMsg(null);
    startTransition(async () => {
      const res = await updateOrderStatus({
        orderId,
        status,
        reasonId: reasonId || null,
        lang,
      });
      if (res.ok) {
        setMsg({ ok: true, text: t.updated });
        router.refresh();
      } else {
        setMsg({
          ok: false,
          text: res.error === "stock" ? t.errStock : t.errGeneric,
        });
      }
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <label className="mb-2 block text-sm font-semibold text-ink">
        {t.changeStatus}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatus);
            setReasonId("");
            setMsg(null);
          }}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>

        {needsReason && reasons.length > 0 && (
          <select
            value={reasonId}
            onChange={(e) => setReasonId(e.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
          >
            <option value="">{t.selectReason}</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.id}>
                {pickLocale(r, "label", lang)}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={apply}
          disabled={pending || status === current}
          className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {t.apply}
        </button>
      </div>

      {msg && (
        <p
          className={cn(
            "mt-3 text-sm font-medium",
            msg.ok ? "text-green-600" : "text-red-600",
          )}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
