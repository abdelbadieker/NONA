// Client-safe theme/content types and defaults (no server-only imports).

export type Theme = {
  blush: string;
  blushDark: string;
  gold: string;
  ink: string;
  background: string;
};

export const DEFAULT_THEME: Theme = {
  blush: "#f5d0d5",
  blushDark: "#e8a9b2",
  gold: "#d4af37",
  ink: "#1a1a1a",
  background: "#ffffff",
};

export type HeroLocale = {
  badge?: string;
  title?: string;
  subtitle?: string;
  cta?: string;
  announcement?: string;
};

export type HomeContent = {
  heroImage?: string;
  ar: HeroLocale;
  fr: HeroLocale;
  en: HeroLocale;
};
