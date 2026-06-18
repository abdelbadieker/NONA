import "server-only";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/ar";

const loaders: Record<Locale, () => Promise<Dictionary>> = {
  ar: () => import("./dictionaries/ar").then((m) => m.ar),
  fr: () => import("./dictionaries/fr").then((m) => m.fr),
  en: () => import("./dictionaries/en").then((m) => m.en),
};

/** Load the dictionary for a locale (server-only). */
export function getDictionary(locale: Locale): Promise<Dictionary> {
  return loaders[locale]();
}

export type { Dictionary };
