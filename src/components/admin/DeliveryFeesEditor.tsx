"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { AdminText } from "@/i18n/admin";
import { saveDeliveryFees } from "@/lib/actions/admin-config";

type Fee = {
  id: string;
  wilaya_code: number;
  name_ar: string;
  name_fr: string | null;
  home_fee: number;
  stopdesk_fee: number;
};

const cell =
  "w-24 rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-blush-dark";

export function DeliveryFeesEditor({
  lang,
  t,
  common,
  fees,
}: {
  lang: Locale;
  t: AdminText["settings"];
  common: AdminText["common"];
  fees: Fee[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [rows, setRows] = useState(
    fees.map((f) => ({
      id: f.id,
      code: f.wilaya_code,
      name: lang === "ar" ? f.name_ar : (f.name_fr ?? f.name_ar),
      home: String(f.home_fee),
      stopdesk: String(f.stopdesk_fee),
    })),
  );

  const setRow = (id: string, patch: Partial<(typeof rows)[number]>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  function save() {
    setSaved(false);
    start(async () => {
      await saveDeliveryFees(
        rows.map((r) => ({
          id: r.id,
          home_fee: Number(r.home) || 0,
          stopdesk_fee: Number(r.stopdesk) || 0,
        })),
        lang,
      );
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <h2 className="mb-3 font-semibold text-ink">{t.deliveryFees}</h2>
      <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-cream text-xs text-muted">
            <tr>
              <th className="p-2 text-start font-medium">{t.title}</th>
              <th className="p-2 font-medium">{t.homeFee}</th>
              <th className="p-2 font-medium">{t.stopdeskFee}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="p-2 text-ink">
                  {r.code} · {r.name}
                </td>
                <td className="p-2 text-center">
                  <input
                    value={r.home}
                    inputMode="numeric"
                    onChange={(e) => setRow(r.id, { home: e.target.value })}
                    className={cell}
                  />
                </td>
                <td className="p-2 text-center">
                  <input
                    value={r.stopdesk}
                    inputMode="numeric"
                    onChange={(e) => setRow(r.id, { stopdesk: e.target.value })}
                    className={cell}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? common.saving : common.save}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check className="size-4" aria-hidden />
            {t.saved}
          </span>
        )}
      </div>
    </div>
  );
}
