"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import type { StoreText } from "@/i18n/store";
import { submitReview } from "@/lib/actions/reviews";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-blush-dark";

export function ReviewForm({ productId, t }: { productId: string | null; t: StoreText["reviews"] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (msg?.ok) {
    return (
      <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
        {msg.text}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border-2 border-ink px-5 py-2 text-sm font-semibold text-ink hover:bg-cream"
      >
        {t.leave}
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim().length < 2 || rating < 1) {
          setMsg({ ok: false, text: t.invalid });
          return;
        }
        start(async () => {
          const r = await submitReview({ productId, customerName: name, rating, body, website });
          setMsg(r.ok ? { ok: true, text: t.thanks } : { ok: false, text: r.error === "rate" ? t.rate : r.error === "validation" ? t.invalid : t.error });
        });
      }}
      className="space-y-3 rounded-2xl border border-line bg-white p-4"
    >
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-ink">{t.rating}</legend>
        <div className="flex gap-1" dir="ltr">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n}/5`} aria-pressed={rating === n}>
              <Star className={cn("size-7", n <= rating ? "fill-gold text-gold" : "text-line")} aria-hidden />
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink">{t.name}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required className={inputCls} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink">{t.body}</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={3} className={inputCls} />
      </label>
      <input
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute -start-[9999px] size-px opacity-0"
      />
      {msg && (
        <p role="alert" className="text-sm text-red-600">
          {msg.text}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? t.sending : t.submit}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 text-sm text-muted">
          {t.close}
        </button>
      </div>
    </form>
  );
}
