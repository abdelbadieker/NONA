"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { AdminText } from "@/i18n/admin";
import { addReason, deleteReason } from "@/lib/actions/admin-config";
import { pickLocale } from "@/lib/utils";

type Reason = {
  id: string;
  label_ar: string;
  label_fr: string | null;
  label_en: string | null;
};

const inputCls =
  "min-w-0 flex-1 rounded-lg border border-line bg-white px-2.5 py-2 text-sm text-ink outline-none focus:border-blush-dark";

export function ReasonManager({
  kind,
  title,
  reasons,
  lang,
  t,
}: {
  kind: "cancellation" | "return";
  title: string;
  reasons: Reason[];
  lang: Locale;
  t: AdminText["reasons"];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ar, setAr] = useState("");
  const [fr, setFr] = useState("");
  const [en, setEn] = useState("");

  function add() {
    if (!ar.trim()) return;
    start(async () => {
      await addReason(kind, { ar, fr, en }, lang);
      setAr("");
      setFr("");
      setEn("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <h2 className="mb-3 font-semibold text-ink">{title}</h2>
      <ul className="mb-3 divide-y divide-line">
        {reasons.length === 0 ? (
          <li className="py-2 text-sm text-muted">{t.empty}</li>
        ) : (
          reasons.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 py-2 text-sm"
            >
              <span className="text-ink">{pickLocale(r, "label", lang)}</span>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await deleteReason(kind, r.id, lang);
                    router.refresh();
                  })
                }
                className="grid size-8 place-items-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                aria-label="delete"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))
        )}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <input value={ar} onChange={(e) => setAr(e.target.value)} placeholder="AR" className={inputCls} />
        <input value={fr} onChange={(e) => setFr(e.target.value)} placeholder="FR" className={inputCls} />
        <input value={en} onChange={(e) => setEn(e.target.value)} placeholder="EN" className={inputCls} />
        <button
          type="button"
          onClick={add}
          disabled={pending || !ar.trim()}
          className="flex items-center gap-1 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden />
          {t.add}
        </button>
      </div>
    </div>
  );
}
