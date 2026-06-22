import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import {
  DEFAULT_THEME,
  type HeroLocale,
  type HomeContent,
  type Theme,
} from "@/lib/appearance-types";

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
    const overrides = Object.fromEntries(
      Object.entries(v).filter(([, val]) => typeof val === "string" && val),
    );
    return { ...DEFAULT_THEME, ...overrides };
  },
  ["theme-v1"],
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
    return {
      heroImage: (v.hero_image as string) || undefined,
      ar: loc("ar"),
      fr: loc("fr"),
      en: loc("en"),
    };
  },
  ["home-content-v1"],
  { revalidate: 300, tags: ["settings"] },
);
