"use client";

import { useState, useTransition } from "react";
import type { Locale } from "@/i18n/config";
import type { StoreText } from "@/i18n/store";
import { subscribeNewsletter } from "@/lib/actions/forms";

export function NewsletterForm({ lang, t }: { lang: Locale; t: StoreText["forms"] }) {
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await subscribeNewsletter({ email, consent, locale: lang, website });
      setMsg(
        res.ok
          ? { ok: true, text: t.subscribed }
          : { ok: false, text: res.error === "rate" ? t.rate : res.error === "validation" ? t.invalid : t.error },
      );
    });
  }

  if (msg?.ok) {
    return (
      <p className="text-sm font-medium text-green-700" role="status">
        {msg.text}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <p className="text-sm font-semibold text-ink">{t.newsletterTitle}</p>
      <p className="text-xs text-muted">{t.newsletterText}</p>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="newsletter-email">
          {t.email}
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          dir="ltr"
          maxLength={120}
          placeholder="email@example.com"
          className="min-w-0 flex-1 rounded-full border border-line bg-white px-4 py-2 text-sm text-ink outline-none focus:border-blush-dark"
        />
        <button
          type="submit"
          disabled={pending || !consent}
          className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t.subscribe}
        </button>
      </div>
      <label className="flex items-start gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 size-3.5 accent-blush-dark"
        />
        {t.newsletterConsent}
      </label>
      <input
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute -start-[9999px] size-px opacity-0"
      />
      {msg && !msg.ok && (
        <p className="text-xs text-red-600" role="alert">
          {msg.text}
        </p>
      )}
    </form>
  );
}
