/** Supported locales. Arabic is the default and is RTL. */
export const locales = ["ar", "fr", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

export const localeDirection: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  fr: "ltr",
  en: "ltr",
};

/** Native display name for each locale (used in the language switcher). */
export const localeNames: Record<Locale, string> = {
  ar: "العربية",
  fr: "Français",
  en: "English",
};

/** Short label/flag-ish tag shown in compact switchers. */
export const localeShort: Record<Locale, string> = {
  ar: "ع",
  fr: "FR",
  en: "EN",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export function getDirection(locale: Locale): "rtl" | "ltr" {
  return localeDirection[locale];
}
