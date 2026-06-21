"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { AdminText } from "@/i18n/admin";
import { saveMarketing } from "@/lib/actions/admin-config";

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-blush-dark";

export function MarketingForm({
  lang,
  t,
  common,
  initial,
}: {
  lang: Locale;
  t: AdminText["settings"];
  common: AdminText["common"];
  initial: { metaPixelId: string; metaCapiToken: string; tiktokPixelId: string };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [metaPixelId, setMetaPixelId] = useState(initial.metaPixelId);
  const [metaCapiToken, setMetaCapiToken] = useState(initial.metaCapiToken);
  const [tiktokPixelId, setTiktokPixelId] = useState(initial.tiktokPixelId);

  function save() {
    setSaved(false);
    start(async () => {
      const r = await saveMarketing(
        { metaPixelId, metaCapiToken, tiktokPixelId },
        lang,
      );
      if (r.ok) {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <h2 className="font-semibold text-ink">{t.marketing}</h2>
      <p className="mt-1 mb-3 text-xs text-muted">{t.marketingHint}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">
            {t.metaPixel}
          </span>
          <input
            dir="ltr"
            value={metaPixelId}
            onChange={(e) => setMetaPixelId(e.target.value)}
            placeholder="1234567890"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">
            {t.tiktokPixel}
          </span>
          <input
            dir="ltr"
            value={tiktokPixelId}
            onChange={(e) => setTiktokPixelId(e.target.value)}
            placeholder="CXXXXXXXXXXXXXXX"
            className={inputCls}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-ink">
            {t.capiToken}
          </span>
          <input
            type="password"
            dir="ltr"
            value={metaCapiToken}
            onChange={(e) => setMetaCapiToken(e.target.value)}
            placeholder="EAAB…"
            autoComplete="off"
            className={inputCls}
          />
        </label>
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
