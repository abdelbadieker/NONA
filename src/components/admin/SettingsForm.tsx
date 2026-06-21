"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { AdminText } from "@/i18n/admin";
import { saveStoreSettings } from "@/lib/actions/admin-config";

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-blush-dark";

export function SettingsForm({
  lang,
  t,
  common,
  initialStore,
  initialSocial,
}: {
  lang: Locale;
  t: AdminText["settings"];
  common: AdminText["common"];
  initialStore: Record<string, string>;
  initialSocial: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [store, setStore] = useState({
    name: initialStore.name ?? "",
    phone: initialStore.phone ?? "",
    email: initialStore.email ?? "",
  });
  const [social, setSocial] = useState({
    instagram: initialSocial.instagram ?? "",
    facebook: initialSocial.facebook ?? "",
    tiktok: initialSocial.tiktok ?? "",
    whatsapp: initialSocial.whatsapp ?? "",
  });

  function save() {
    setSaved(false);
    start(async () => {
      const res = await saveStoreSettings(
        { ...initialStore, ...store },
        { ...initialSocial, ...social },
        lang,
      );
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    });
  }

  const fields: [string, keyof typeof store | keyof typeof social, "store" | "social", string?][] = [
    [t.storeName, "name", "store"],
    [t.phone, "phone", "store"],
    [t.email, "email", "store"],
    [t.whatsapp, "whatsapp", "social"],
    [t.instagram, "instagram", "social"],
    [t.facebook, "facebook", "social"],
    [t.tiktok, "tiktok", "social"],
  ];

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <h2 className="mb-3 font-semibold text-ink">{t.title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(([label, key, group]) => (
          <label key={key} className="block">
            <span className="mb-1 block text-sm font-medium text-ink">
              {label}
            </span>
            <input
              dir={key === "name" ? undefined : "ltr"}
              value={group === "store" ? store[key as keyof typeof store] : social[key as keyof typeof social]}
              onChange={(e) =>
                group === "store"
                  ? setStore((s) => ({ ...s, [key]: e.target.value }))
                  : setSocial((s) => ({ ...s, [key]: e.target.value }))
              }
              className={inputCls}
            />
          </label>
        ))}
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
