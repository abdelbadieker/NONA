import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import {
  DEFAULT_THEME,
  type HeroLocale,
  type HomeContent,
  type Theme,
} from "@/lib/appearance-types";
import { HEX_COLOR_RE } from "@/lib/validation";

export type { Theme, HeroLocale, HomeContent } from "@/lib/appearance-types";

export const getTheme = unstable_cache(
  async (): Promise<Theme> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "theme")
      .maybeSingle();
    const v = (data?.value ?? {}) as Partial<Theme>;
    // Theme values are written into a <style> tag: only strict #rrggbb
    // colors for known keys are accepted, anything else falls back.
    const overrides = Object.fromEntries(
      Object.entries(v).filter(
        ([key, val]) => key in DEFAULT_THEME && typeof val === "string" && HEX_COLOR_RE.test(val),
      ),
    );
    return { ...DEFAULT_THEME, ...overrides };
  },
  ["theme-v2"],
  { revalidate: 300, tags: ["settings"] },
);

export const getHomeContent = unstable_cache(
  async (): Promise<HomeContent> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "home")
      .maybeSingle();
    const v = (data?.value ?? {}) as Record<string, unknown>;
    const loc = (k: string) => (v[k] ?? {}) as HeroLocale;
    const hero = typeof v.hero_image === "string" && /^https:\/\//.test(v.hero_image) ? v.hero_image : undefined;
    return {
      heroImage: hero,
      ar: loc("ar"),
      fr: loc("fr"),
      en: loc("en"),
    };
  },
  ["home-content-v1"],
  { revalidate: 300, tags: ["settings"] },
);
