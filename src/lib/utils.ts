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
