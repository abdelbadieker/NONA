import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_SECTIONS, readSections, type Section } from "@/lib/sections";

/** Published homepage layout; the original layout until one is published. */
export const getHomeSections = unstable_cache(
  async (): Promise<Section[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase.from("settings").select("value").eq("key", "home_sections").maybeSingle();
    return data ? readSections(data.value) : DEFAULT_SECTIONS;
  },
  ["home-sections-v1"],
  { revalidate: 300, tags: ["settings"] },
);

/** Draft layout + its preview token (server-only; private settings row). */
export async function getHomeDraft(): Promise<{ sections: Section[]; token: string | null; savedAt: string | null }> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "home_sections_draft").maybeSingle();
  const v = (data?.value ?? null) as { sections?: unknown; token?: string; saved_at?: string } | null;
  if (v?.sections) return { sections: readSections(v.sections), token: v.token ?? null, savedAt: v.saved_at ?? null };
  return { sections: await getHomeSections(), token: null, savedAt: null };
}
