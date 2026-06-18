"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ar";

export function SortSelect({
  lang,
  dict,
  current,
  category,
}: {
  lang: Locale;
  dict: Dictionary;
  current: string;
  category?: string;
}) {
  const router = useRouter();

  const options = [
    { value: "newest", label: dict.shop.sortNewest },
    { value: "price_asc", label: dict.shop.sortPriceAsc },
    { value: "price_desc", label: dict.shop.sortPriceDesc },
    { value: "bestselling", label: dict.shop.sortBestselling },
  ];

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const sort = e.target.value;
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (sort && sort !== "newest") params.set("sort", sort);
    const qs = params.toString();
    router.push(`/${lang}/shop${qs ? `?${qs}` : ""}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      {dict.shop.sortBy}
      <select
        value={current}
        onChange={onChange}
        className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm font-medium text-ink focus:border-blush-dark focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
