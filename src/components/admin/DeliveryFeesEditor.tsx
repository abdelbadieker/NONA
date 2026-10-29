"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { AdminText } from "@/i18n/admin";
import type { AdminOpsText } from "@/i18n/admin-ops";
import { saveDeliveryFees, saveDeliverySettings } from "@/lib/actions/admin-config";
import type { DeliveryFee } from "@/lib/types";
import { ActionMessage, useAdminAction } from "./use-action";
import { btnPrimary, inputCls } from "./ui";

const cell =
  "w-24 rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-blush-dark disabled:bg-cream";

export function DeliveryFeesEditor({
  lang,
  t,
  ops,
  fees,
  settings,
}: {
  lang: Locale;
  t: AdminText["settings"];
  ops: AdminOpsText;
  fees: DeliveryFee[];
  settings: { freeThreshold: number; daysMin: number; daysMax: number };
}) {
  const feesAction = useAdminAction(ops.errors, t.saved);
  const settingsAction = useAdminAction(ops.errors, t.saved);
  const [threshold, setThreshold] = useState(String(settings.freeThreshold));
  const [daysMin, setDaysMin] = useState(String(settings.daysMin));
  const [daysMax, setDaysMax] = useState(String(settings.daysMax));
  const [rows, setRows] = useState(
    fees.map((f) => ({
      id: f.id,
      code: f.wilaya_code,
      name: lang === "ar" ? f.name_ar : (f.name_fr ?? f.name_ar),
      home: String(f.home_fee),
      stopdesk: String(f.stopdesk_fee),
      active: f.is_active,
      homeOn: f.home_enabled !== false,
      deskOn: f.stopdesk_enabled !== false,
    })),
  );
  const setRow = (id: string, patch: Partial<(typeof rows)[number]>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          settingsAction.run(() =>
            saveDeliverySettings(
              { freeThreshold: Number(threshold) || 0, defaultDaysMin: Number(daysMin) || 0, defaultDaysMax: Number(daysMax) || 0 },
              lang,
            ),
          );
        }}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Free delivery ≥ (DA, 0 = off)</span>
          <input value={threshold} onChange={(e) => setThreshold(e.target.value)} inputMode="numeric" dir="ltr" className={`${inputCls} w-40`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">{t.deliveryFees} (min–max)</span>
          <span className="flex gap-2">
            <input value={daysMin} onChange={(e) => setDaysMin(e.target.value)} inputMode="numeric" dir="ltr" className={`${inputCls} w-20`} />
            <input value={daysMax} onChange={(e) => setDaysMax(e.target.value)} inputMode="numeric" dir="ltr" className={`${inputCls} w-20`} />
          </span>
        </label>
        <button type="submit" disabled={settingsAction.pending} className={btnPrimary}>
          {ops.common.save}
        </button>
        <ActionMessage msg={settingsAction.msg} />
      </form>

      <div className="rounded-2xl border border-line bg-white p-4">
        <h2 className="mb-3 font-semibold text-ink">{t.deliveryFees}</h2>
        <div className="max-h-[32rem] overflow-auto rounded-lg border border-line">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="sticky top-0 bg-cream text-xs text-muted">
              <tr>
                <th className="p-2 text-start font-medium">{ops.orders.wilayaFilter}</th>
                <th className="p-2 font-medium">{ops.common.active}</th>
                <th className="p-2 font-medium">{t.homeFee}</th>
                <th className="p-2 font-medium">{t.stopdeskFee}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className={r.active ? undefined : "opacity-50"}>
                  <td className="p-2 text-ink">
                    {r.code} · {r.name}
                  </td>
                  <td className="p-2 text-center">
                    <input type="checkbox" checked={r.active} onChange={(e) => setRow(r.id, { active: e.target.checked })} aria-label={`${r.name} ${ops.common.active}`} className="size-4 accent-blush-dark" />
                  </td>
                  <td className="p-2">
                    <span className="flex items-center justify-center gap-1.5">
                      <input type="checkbox" checked={r.homeOn} onChange={(e) => setRow(r.id, { homeOn: e.target.checked })} aria-label={`${r.name} ${t.homeFee}`} className="size-4 accent-blush-dark" />
                      <input value={r.home} inputMode="numeric" dir="ltr" disabled={!r.homeOn} onChange={(e) => setRow(r.id, { home: e.target.value })} aria-label={`${r.name} ${t.homeFee}`} className={cell} />
                    </span>
                  </td>
                  <td className="p-2">
                    <span className="flex items-center justify-center gap-1.5">
                      <input type="checkbox" checked={r.deskOn} onChange={(e) => setRow(r.id, { deskOn: e.target.checked })} aria-label={`${r.name} ${t.stopdeskFee}`} className="size-4 accent-blush-dark" />
                      <input value={r.stopdesk} inputMode="numeric" dir="ltr" disabled={!r.deskOn} onChange={(e) => setRow(r.id, { stopdesk: e.target.value })} aria-label={`${r.name} ${t.stopdeskFee}`} className={cell} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            disabled={feesAction.pending}
            onClick={() =>
              feesAction.run(() =>
                saveDeliveryFees(
                  rows.map((r) => ({
                    id: r.id,
                    home_fee: Number(r.home) || 0,
                    stopdesk_fee: Number(r.stopdesk) || 0,
                    is_active: r.active,
                    home_enabled: r.homeOn,
                    stopdesk_enabled: r.deskOn,
                  })),
                  lang,
                ),
              )
            }
            className={btnPrimary}
          >
            {feesAction.pending ? ops.common.saving : ops.common.save}
          </button>
          <ActionMessage msg={feesAction.msg} />
        </div>
      </div>
    </div>
  );
}
