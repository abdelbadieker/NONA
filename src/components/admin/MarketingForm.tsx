"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { AdminText } from "@/i18n/admin";
import type { AdminOpsText } from "@/i18n/admin-ops";
import { saveMarketing } from "@/lib/actions/admin-config";
import { ActionMessage, useAdminAction } from "./use-action";
import { btnPrimary, inputCls } from "./ui";

const FIELD_ERRORS: Record<string, string> = {
  metaPixelId: "Meta Pixel ID: digits only",
  tiktokPixelId: "TikTok Pixel ID: letters and digits",
  ga4Id: "GA4: G-XXXXXXX",
  metaCapiToken: "CAPI token format",
};

export function MarketingForm({
  lang,
  t,
  ops,
  initial,
}: {
  lang: Locale;
  t: AdminText["settings"];
  ops: AdminOpsText;
  initial: { metaPixelId: string; tiktokPixelId: string; ga4Id: string; hasCapiToken: boolean };
}) {
  const errors = { ...ops.errors, ...Object.fromEntries(Object.entries(FIELD_ERRORS).map(([k, v]) => [`validation:${k}`, v])) };
  const { pending, run, msg } = useAdminAction(errors, t.saved);
  const [metaPixelId, setMetaPixelId] = useState(initial.metaPixelId);
  const [tiktokPixelId, setTiktokPixelId] = useState(initial.tiktokPixelId);
  const [ga4Id, setGa4Id] = useState(initial.ga4Id);
  const [token, setToken] = useState("");
  const [removeToken, setRemoveToken] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            saveMarketing(
              { metaPixelId: metaPixelId.trim(), tiktokPixelId: tiktokPixelId.trim(), ga4Id: ga4Id.trim(), metaCapiToken: removeToken ? "-" : token.trim() },
              lang,
            ),
          () => {
            setToken("");
            setRemoveToken(false);
          },
        );
      }}
      className="rounded-2xl border border-line bg-white p-4"
    >
      <h2 className="font-semibold text-ink">{t.marketing}</h2>
      <p className="mb-3 mt-1 text-xs text-muted">{t.marketingHint}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">{t.metaPixel}</span>
          <input dir="ltr" value={metaPixelId} onChange={(e) => setMetaPixelId(e.target.value)} placeholder="1234567890" className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">{t.tiktokPixel}</span>
          <input dir="ltr" value={tiktokPixelId} onChange={(e) => setTiktokPixelId(e.target.value)} placeholder="CXXXXXXXXXXXXXXX" className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Google Analytics 4</span>
          <input dir="ltr" value={ga4Id} onChange={(e) => setGa4Id(e.target.value)} placeholder="G-XXXXXXXXXX" className={inputCls} />
        </label>
        <label className="block sm:col-span-3">
          <span className="mb-1 block text-sm font-medium text-ink">
            {t.capiToken}{" "}
            <span className="text-xs font-normal text-muted">
              ({initial.hasCapiToken ? ops.integrations.configured : ops.integrations.notConfigured})
            </span>
          </span>
          {/* Write-only: the stored token is never sent to the browser. */}
          <input
            type="password"
            dir="ltr"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={initial.hasCapiToken ? "••••••••  (empty = keep)" : "EAAB…"}
            autoComplete="off"
            disabled={removeToken}
            className={inputCls}
          />
        </label>
        {initial.hasCapiToken && (
          <label className="flex items-center gap-2 text-xs text-muted sm:col-span-3">
            <input type="checkbox" checked={removeToken} onChange={(e) => setRemoveToken(e.target.checked)} className="size-4 accent-blush-dark" />
            {ops.common.cancel} CAPI token
          </label>
        )}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? ops.common.saving : ops.common.save}
        </button>
        <ActionMessage msg={msg} />
      </div>
    </form>
  );
}
