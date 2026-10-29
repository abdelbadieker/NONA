"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { StoreText } from "@/i18n/store";
import { submitContactForm } from "@/lib/actions/forms";

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-blush-dark";

export function ContactForm({ lang, t }: { lang: Locale; t: StoreText["forms"] }) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "sent" | string>("idle");
  const [f, setF] = useState({ name: "", phone: "", email: "", message: "", website: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await submitContactForm({ form: "contact", locale: lang, ...f });
      setStatus(res.ok ? "sent" : res.error === "rate" ? t.rate : res.error === "validation" ? t.invalid : t.error);
    });
  }

  if (status === "sent") {
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-green-50 p-5 text-sm font-medium text-green-800" role="status">
        <CheckCircle2 className="size-5" aria-hidden />
        {t.sent}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-white p-5">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">{t.name}</span>
        <input value={f.name} onChange={set("name")} required minLength={2} maxLength={80} autoComplete="name" className={inputCls} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">{t.phone}</span>
          <input value={f.phone} onChange={set("phone")} inputMode="tel" dir="ltr" maxLength={10} autoComplete="tel" className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">{t.email}</span>
          <input value={f.email} onChange={set("email")} type="email" dir="ltr" maxLength={120} autoComplete="email" className={inputCls} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">{t.message}</span>
        <textarea value={f.message} onChange={set("message")} required minLength={5} maxLength={2000} rows={4} className={inputCls} />
      </label>
      {/* Honeypot — hidden from people, filled by bots. */}
      <input
        value={f.website}
        onChange={set("website")}
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute -start-[9999px] size-px opacity-0"
      />
      {status !== "idle" && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {status}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? t.sending : t.send}
      </button>
    </form>
  );
}
