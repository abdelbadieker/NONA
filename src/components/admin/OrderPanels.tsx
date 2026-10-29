"use client";

import { useState } from "react";
import { Flag, PhoneCall, Truck } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { AdminOpsText } from "@/i18n/admin-ops";
import {
  addOrderNote,
  assignOrder,
  logCallAttempt,
  logDeliveryAttempt,
  setOrderFlag,
  updateCod,
  updateOrderDetails,
  updateShipment,
} from "@/lib/actions/orders";
import { CALL_OUTCOMES, DELIVERY_FAILURE_REASONS } from "@/lib/order-status";
import { cn, formatPrice } from "@/lib/utils";
import { ActionMessage, useAdminAction } from "./use-action";
import { btnPrimary, btnSecondary, inputCls, labelCls } from "./ui";

type Common = { orderId: string; lang: Locale; ops: AdminOpsText };

export function CallLogger({ orderId, lang, ops, attempts, last }: Common & { attempts: number; last: string | null }) {
  const { pending, run, msg } = useAdminAction(ops.errors, ops.common.saved);
  const [note, setNote] = useState("");
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm text-ink">
        <PhoneCall className="size-4 text-blush-dark" aria-hidden />
        {ops.orders.callAttempts}: <strong>{attempts}</strong>
        {last && <span className="text-muted">· {ops.orders.callOutcomes[last] ?? last}</span>}
      </p>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        placeholder={ops.orders.notePlaceholder}
        aria-label={ops.inventory.note}
        className={inputCls}
      />
      <div className="flex flex-wrap gap-2">
        {CALL_OUTCOMES.map((o) => (
          <button
            key={o}
            type="button"
            disabled={pending}
            onClick={() => run(() => logCallAttempt({ orderId, outcome: o, note, lang }), () => setNote(""))}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium disabled:opacity-50",
              o === "confirmed" ? "border-green-300 bg-green-50 text-green-800" : "border-line bg-white text-ink hover:bg-cream",
            )}
          >
            {ops.orders.callOutcomes[o]}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">{ops.orders.callTip}</p>
      <ActionMessage msg={msg} />
    </div>
  );
}

export function ShipmentForm({
  orderId,
  lang,
  ops,
  carrier,
  trackingNumber,
  status,
  attempts,
}: Common & { carrier: string | null; trackingNumber: string | null; status: string; attempts: number }) {
  const { pending, run, msg } = useAdminAction(ops.errors, ops.common.saved);
  const [c, setC] = useState(carrier ?? "");
  const [tn, setTn] = useState(trackingNumber ?? "");
  const [reason, setReason] = useState<string>(DELIVERY_FAILURE_REASONS[0]);
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label>
          <span className={labelCls}>{ops.orders.carrier}</span>
          <input value={c} onChange={(e) => setC(e.target.value)} maxLength={60} className={inputCls} placeholder="Yalidine, ZR Express…" />
        </label>
        <label>
          <span className={labelCls}>{ops.orders.trackingNumber}</span>
          <input value={tn} onChange={(e) => setTn(e.target.value)} maxLength={80} dir="ltr" className={inputCls} />
        </label>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => updateShipment({ orderId, carrier: c, trackingNumber: tn, lang }))}
        className={btnSecondary}
      >
        <Truck className="size-4" aria-hidden />
        {ops.common.save}
      </button>
      {status === "in_delivery" && (
        <div className="space-y-2 border-t border-line pt-3">
          <p className="text-sm text-ink">
            {ops.orders.deliveryAttempts}: <strong>{attempts}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            <select value={reason} onChange={(e) => setReason(e.target.value)} className={cn(inputCls, "w-auto")} aria-label={ops.inventory.reason}>
              {DELIVERY_FAILURE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {ops.orders.failureReasons[r]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => logDeliveryAttempt({ orderId, reason, lang }))}
              className={btnSecondary}
            >
              {ops.orders.logFailedDelivery}
            </button>
          </div>
        </div>
      )}
      <ActionMessage msg={msg} />
    </div>
  );
}

export function CodPanel({
  orderId,
  lang,
  ops,
  status,
  paymentStatus,
  total,
  collected,
  currency,
  canRefund,
}: Common & {
  status: string;
  paymentStatus: string;
  total: number;
  collected: number | null;
  currency: string;
  canRefund: boolean;
}) {
  const { pending, run, msg } = useAdminAction(ops.errors, ops.common.saved);
  const [amount, setAmount] = useState(String(collected ?? total));
  const canCollect = ["in_delivery", "delivered"].includes(status) && ["pending", "collected"].includes(paymentStatus);
  return (
    <div className="space-y-3 text-sm">
      <dl className="grid grid-cols-2 gap-2">
        <div>
          <dt className="text-muted">{ops.orders.amountDue}</dt>
          <dd className="font-semibold text-ink">
            {formatPrice(total)} {currency}
          </dd>
        </div>
        <div>
          <dt className="text-muted">{ops.orders.collected}</dt>
          <dd className="font-semibold text-ink">{collected != null ? `${formatPrice(collected)} ${currency}` : "—"}</dd>
        </div>
      </dl>
      {canCollect && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="w-32">
            <span className={labelCls}>{ops.orders.collected}</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" dir="ltr" className={inputCls} />
          </label>
          <button
            type="button"
            disabled={pending || !(Number(amount) >= 0)}
            onClick={() => run(() => updateCod({ orderId, action: "collected", amount: Number(amount), lang }))}
            className={btnSecondary}
          >
            {ops.orders.markCollected}
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {paymentStatus === "collected" && (
          <button type="button" disabled={pending} onClick={() => run(() => updateCod({ orderId, action: "settled", lang }))} className={btnPrimary}>
            {ops.orders.markSettled}
          </button>
        )}
        {canRefund && status === "returned" && ["collected", "settled"].includes(paymentStatus) && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm(ops.orders.markRefunded + "?")) run(() => updateCod({ orderId, action: "refunded", lang }));
            }}
            className={btnSecondary}
          >
            {ops.orders.markRefunded}
          </button>
        )}
      </div>
      <ActionMessage msg={msg} />
    </div>
  );
}

export function FlagAndAssign({
  orderId,
  lang,
  ops,
  flagged,
  flagReason,
  assignedTo,
  staff,
}: Common & { flagged: boolean; flagReason: string | null; assignedTo: string | null; staff: { id: string; label: string; active: boolean }[] }) {
  const { pending, run, msg } = useAdminAction(ops.errors, ops.common.saved);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {flagged && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            <Flag className="size-3" aria-hidden />
            {ops.orders.flagReasons[flagReason ?? ""] ?? flagReason}
          </span>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setOrderFlag({ orderId, flagged: !flagged, reason: "manual_review", lang }))}
          className={btnSecondary}
        >
          <Flag className="size-4" aria-hidden />
          {flagged ? ops.orders.unflag : ops.orders.flag}
        </button>
      </div>
      <label className="block">
        <span className={labelCls}>{ops.orders.assignedTo}</span>
        <select
          defaultValue={assignedTo ?? ""}
          disabled={pending}
          onChange={(e) => run(() => assignOrder({ orderId, staffId: e.target.value || null, lang }))}
          className={inputCls}
        >
          <option value="">{ops.orders.unassigned}</option>
          {staff
            .filter((s) => s.active || s.id === assignedTo)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
        </select>
      </label>
      <ActionMessage msg={msg} />
    </div>
  );
}

export function NoteForm({ orderId, lang, ops }: Common) {
  const { pending, run, msg } = useAdminAction(ops.errors, ops.common.saved);
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) run(() => addOrderNote({ orderId, message: text, lang }), () => setText(""));
      }}
      className="space-y-2"
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder={ops.orders.notePlaceholder}
        aria-label={ops.orders.addNote}
        className={inputCls}
      />
      <button type="submit" disabled={pending || !text.trim()} className={btnSecondary}>
        {ops.orders.addNote}
      </button>
      <ActionMessage msg={msg} />
    </form>
  );
}

export function DetailsEditor({
  orderId,
  lang,
  ops,
  labels,
  initial,
}: Common & {
  labels: { name: string; phone: string; commune: string; address: string; notes: string };
  initial: { customerName: string; customerPhone: string; customerPhone2: string; commune: string; address: string; notes: string; tags: string[] };
}) {
  const { pending, run, msg } = useAdminAction(ops.errors, ops.common.saved);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ ...initial, tags: initial.tags.join(", ") });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-blush-dark hover:underline">
        {ops.orders.editDetails}
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            updateOrderDetails({
              orderId,
              lang,
              ...f,
              tags: f.tags.split(",").map((s) => s.trim()).filter(Boolean),
            }),
          () => setOpen(false),
        );
      }}
      className="grid gap-2 sm:grid-cols-2"
    >
      <label>
        <span className={labelCls}>{labels.name}</span>
        <input value={f.customerName} onChange={set("customerName")} className={inputCls} required />
      </label>
      <label>
        <span className={labelCls}>{labels.phone}</span>
        <input value={f.customerPhone} onChange={set("customerPhone")} dir="ltr" className={inputCls} required />
      </label>
      <label>
        <span className={labelCls}>{labels.phone} 2</span>
        <input value={f.customerPhone2} onChange={set("customerPhone2")} dir="ltr" className={inputCls} />
      </label>
      <label>
        <span className={labelCls}>{labels.commune}</span>
        <input value={f.commune} onChange={set("commune")} className={inputCls} />
      </label>
      <label className="sm:col-span-2">
        <span className={labelCls}>{labels.address}</span>
        <textarea value={f.address} onChange={set("address")} rows={2} className={inputCls} required />
      </label>
      <label className="sm:col-span-2">
        <span className={labelCls}>{labels.notes}</span>
        <textarea value={f.notes} onChange={set("notes")} rows={2} className={inputCls} />
      </label>
      <label className="sm:col-span-2">
        <span className={labelCls}>{ops.orders.tags}</span>
        <input value={f.tags} onChange={set("tags")} className={inputCls} />
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? ops.common.saving : ops.common.save}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={btnSecondary}>
          {ops.common.cancel}
        </button>
      </div>
      <div className="sm:col-span-2">
        <ActionMessage msg={msg} />
      </div>
    </form>
  );
}
