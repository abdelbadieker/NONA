import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";

export type MarketingPublic = {
  metaPixelId: string;
  tiktokPixelId: string;
};

/** Public pixel IDs (safe for the browser). Cached across requests. */
export const getMarketingPublic = unstable_cache(
  async (): Promise<MarketingPublic> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "marketing")
      .maybeSingle();
    const v = (data?.value ?? {}) as Record<string, string>;
    return {
      metaPixelId: v.meta_pixel_id || "",
      tiktokPixelId: v.tiktok_pixel_id || "",
    };
  },
  ["marketing-public-v2"],
  { revalidate: 120, tags: ["settings"] },
);

/** Full marketing config incl. the secret CAPI token. SERVER-ONLY. */
export async function getMarketingServer(): Promise<{
  metaPixelId: string;
  metaCapiToken: string;
  tiktokPixelId: string;
}> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["marketing", "marketing_secret"]);
  const map = Object.fromEntries(
    ((data as { key: string; value: Record<string, string> }[] | null) ?? []).map(
      (r) => [r.key, r.value],
    ),
  );
  const pub = (map.marketing ?? {}) as Record<string, string>;
  const sec = (map.marketing_secret ?? {}) as Record<string, string>;
  return {
    metaPixelId: pub.meta_pixel_id || "",
    metaCapiToken: sec.meta_capi_token || "",
    tiktokPixelId: pub.tiktok_pixel_id || "",
  };
}
