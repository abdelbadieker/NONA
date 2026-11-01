"use client";

// Client controls for the features rebuilt from the live site: leads,
// blocked phones, review moderation and order spam/archive.
import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { AdminOpsText } from "@/i18n/admin-ops";
import { addBlockedPhone, deleteLead, removeBlockedPhone } from "@/lib/actions/leads";
import { moderateReview } from "@/lib/actions/reviews";
import { blockOrderPhone, setOrderArchived, setOrderSpam } from "@/lib/actions/orders";
import { ActionMessage, useAdminAction } from "./use-action";
import { btnPrimary, btnSecondary, inputCls } from "./ui";

export function DeleteLeadButton({ id, lang, ops }: { id: string; lang: Locale; ops: AdminOpsText }) {
  const { pending, run } = useAdminAction(ops.errors, ops.common.saved);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => confirm(`${ops.live.delete}?`) && run(() => deleteLead(id, lang))}
      className="text-xs text-red-600 hover:underline disabled:opacity-50"
    >
      {ops.live.delete}
    </button>
  );
}

export function BlockedPhonesManager({
  rows,
  lang,
  ops,
  canManage,
}: {
  rows: { phone: string; reason: string | null; created_at: string }[];
  lang: Locale;
  ops: AdminOpsText;
  canManage: boolean;
}) {
  const t = ops.live;
  const { pending, run, msg } = useAdminAction(ops.errors, ops.common.saved);
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">{t.blockedHint}</p>
      {canManage && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => addBlockedPhone(phone, reason, lang), () => {
              setPhone("");
              setReason("");
            });
          }}
          className="flex flex-wrap gap-2"
        >
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.phone} dir="ltr" maxLength={10} className={`${inputCls} w-40`} aria-label={t.phone} />
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.reason} maxLength={200} className={`${inputCls} w-56`} aria-label={t.reason} />
          <button type="submit" disabled={pending || phone.length < 10} className={btnPrimary}>
            {t.add}
          </button>
        </form>
      )}
      <ActionMessage msg={msg} />
      {rows.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line text-sm">
          {rows.map((r) => (
            <li key={r.phone} className="flex items-center justify-between gap-3 px-3 py-2">
              <span>
                <span className="font-medium" dir="ltr">
                  {r.phone}
                </span>
                {r.reason && <span className="text-muted"> · {r.reason}</span>}
              </span>
              {canManage && (
                <button type="button" disabled={pending} onClick={() => run(() => removeBlockedPhone(r.phone, lang))} className="text-xs text-blush-dark hover:underline">
                  {t.unblock}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ReviewModeration({ id, status, lang, ops }: { id: string; status: string; lang: Locale; ops: AdminOpsText }) {
  const { pending, run, msg } = useAdminAction(ops.errors, ops.common.saved);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "approved" && (
        <button type="button" disabled={pending} onClick={() => run(() => moderateReview(id, "approved", lang))} className={btnPrimary}>
          {ops.live.approve}
        </button>
      )}
      {status !== "rejected" && (
        <button type="button" disabled={pending} onClick={() => run(() => moderateReview(id, "rejected", lang))} className={btnSecondary}>
          {ops.live.reject}
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => confirm(`${ops.live.delete}?`) && run(() => moderateReview(id, "delete", lang))}
        className="text-xs text-red-600 hover:underline"
      >
        {ops.live.delete}
      </button>
      <ActionMessage msg={msg} />
    </div>
  );
}

export function OrderSpamArchive({
  orderId,
  lang,
  ops,
  isSpam,
  isArchived,
}: {
  orderId: string;
  lang: Locale;
  ops: AdminOpsText;
  isSpam: boolean;
  isArchived: boolean;
}) {
  const t = ops.live;
  const { pending, run, msg } = useAdminAction(ops.errors, ops.common.saved);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => run(() => setOrderSpam({ orderId, spam: !isSpam, lang }))} className={btnSecondary}>
          {isSpam ? t.unmarkSpam : t.markSpam}
        </button>
        <button type="button" disabled={pending} onClick={() => run(() => setOrderArchived({ orderId, archived: !isArchived, lang }))} className={btnSecondary}>
          {isArchived ? t.unarchive : t.archive}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => confirm(t.blockConfirm) && run(() => blockOrderPhone({ orderId, lang }))}
          className="inline-flex items-center rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {t.blockPhone}
        </button>
      </div>
      <ActionMessage msg={msg} />
    </div>
  );
}
