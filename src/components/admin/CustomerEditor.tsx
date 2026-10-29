"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { AdminOpsText } from "@/i18n/admin-ops";
import { revokeMarketingConsent, updateCustomer } from "@/lib/actions/customers";
import { ActionMessage, useAdminAction } from "./use-action";
import { btnPrimary, btnSecondary, inputCls, labelCls } from "./ui";

export function CustomerEditor({
  id,
  lang,
  ops,
  initial,
  acceptsMarketing,
}: {
  id: string;
  lang: Locale;
  ops: AdminOpsText;
  initial: { fullName: string; email: string; notes: string; tags: string[] };
  acceptsMarketing: boolean;
}) {
  const { pending, run, msg } = useAdminAction(ops.errors, ops.common.saved);
  const [f, setF] = useState({ ...initial, tags: initial.tags.join(", ") });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() =>
          updateCustomer(
            { id, fullName: f.fullName, email: f.email, notes: f.notes, tags: f.tags.split(",").map((s) => s.trim()).filter(Boolean) },
            lang,
          ),
        );
      }}
      className="space-y-3"
    >
      <label className="block">
        <span className={labelCls}>{ops.staff.name}</span>
        <input value={f.fullName} onChange={set("fullName")} maxLength={80} className={inputCls} />
      </label>
      <label className="block">
        <span className={labelCls}>{ops.staff.email}</span>
        <input value={f.email} onChange={set("email")} type="email" dir="ltr" maxLength={120} className={inputCls} />
      </label>
      <label className="block">
        <span className={labelCls}>{ops.customers.tags}</span>
        <input value={f.tags} onChange={set("tags")} className={inputCls} placeholder="vip, lingerie" />
      </label>
      <label className="block">
        <span className={labelCls}>{ops.customers.notes}</span>
        <textarea value={f.notes} onChange={set("notes")} rows={3} maxLength={2000} className={inputCls} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? ops.common.saving : ops.common.save}
        </button>
        {acceptsMarketing && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm(`${ops.customers.revokeConsent}?`)) run(() => revokeMarketingConsent(id, lang));
            }}
            className={btnSecondary}
          >
            {ops.customers.revokeConsent}
          </button>
        )}
      </div>
      <ActionMessage msg={msg} />
    </form>
  );
}
