"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { Locale } from "@/i18n/config";

export function SearchBar({
  lang,
  initial,
  placeholder,
}: {
  lang: Locale;
  initial: string;
  placeholder: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => {
      const q = value.trim();
      router.replace(`/${lang}/search${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    }, 350);
    return () => clearTimeout(id);
  }, [value, lang, router]);

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-line bg-white py-3 pe-10 ps-11 text-sm text-ink focus:border-blush-dark focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="clear"
          className="absolute end-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
