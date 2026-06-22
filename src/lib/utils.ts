import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely (clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a price for Algeria (Latin digits, space grouping, no decimals). */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-DZ", {
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Replace {key} placeholders in a string, e.g. interpolate("Only {n} left", { n: 3 }). */
export function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}

/** Darken a #rrggbb hex color by a fraction (0–1). */
export function darkenHex(hex: string, amount = 0.14): string {
  const m = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return hex;
  const num = parseInt(m, 16);
  const r = Math.max(0, Math.round(((num >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 255) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Pick a localized DB column (e.g. name_fr) with Arabic fallback. */
export function pickLocale(
  rec: Record<string, unknown> | null | undefined,
  base: string,
  locale: string,
): string {
  if (!rec) return "";
  return (
    (rec[`${base}_${locale}`] as string) ||
    (rec[`${base}_ar`] as string) ||
    ""
  );
}
