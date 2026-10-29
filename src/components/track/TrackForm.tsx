"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import type { StoreText } from "@/i18n/store";
import { trackOrder } from "@/lib/actions/tracking";
import type { TrackedOrder } from "@/lib/data/tracking";
import { OrderTrackingView } from "./OrderTrackingView";

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-blush-dark";

export function TrackForm({ t, currency, locale }: { t: StoreText["track"]; currency: string; locale: string }) {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await trackOrder({ orderNumber: orderNumber.replace(/\D/g, ""), phone: phone.trim() });
      if (res.ok) setOrder(res.order);
      else setError(res.error === "rate" ? t.rate : res.error === "validation" ? t.invalid : t.notFound);
    });
  }

  if (order) {
    return (
      <div className="space-y-4">
        <OrderTrackingView order={order} t={t} currency={currency} locale={locale} />
        <button type="button" onClick={() => setOrder(null)} className="text-sm font-medium text-blush-dark underline">
          {t.another}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-white p-5" noValidate>
      <p className="text-sm text-muted">{t.intro}</p>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">{t.orderNumber}</span>
        <input
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          inputMode="numeric"
          dir="ltr"
          required
          placeholder="1001"
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">{t.phone}</span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          required
          maxLength={10}
          placeholder="0600000000"
          className={inputCls}
        />
      </label>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || !orderNumber || phone.length < 10}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        <Search className="size-4" aria-hidden />
        {pending ? t.searching : t.submit}
      </button>
    </form>
  );
}
