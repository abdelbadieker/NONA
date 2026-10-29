import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { GA4_RE, META_PIXEL_RE, TIKTOK_PIXEL_RE } from "@/lib/validation";

export type MarketingPublic = {
  metaPixelId: string;
  tiktokPixelId: string;
  ga4Id: string;
};

// IDs are interpolated into inline scripts, so anything that doesn't match
// the provider's format is dropped here as well as on save.
const safe = (v: unknown, re: RegExp) => (typeof v === "string" && re.test(v) ? v : "");

/** Public pixel IDs (safe for the browser). Cached across requests. */
export const getMarketingPublic = unstable_cache(
  async (): Promise<MarketingPublic> => {
    const supabase = createPublicClient();
    const { data } = await supabase.from("settings").select("value").eq("key", "marketing").maybeSingle();
    const v = (data?.value ?? {}) as Record<string, unknown>;
    return {
      metaPixelId: safe(v.meta_pixel_id, META_PIXEL_RE),
      tiktokPixelId: safe(v.tiktok_pixel_id, TIKTOK_PIXEL_RE),
      ga4Id: safe(v.ga4_id, GA4_RE),
    };
  },
  ["marketing-public-v3"],
  { revalidate: 120, tags: ["settings"] },
);

/** Full marketing config incl. the secret CAPI token. SERVER-ONLY. */
export async function getMarketingServer(): Promise<MarketingPublic & { metaCapiToken: string }> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["marketing", "marketing_secret"]);
  const map = Object.fromEntries(
    ((data as { key: string; value: Record<string, unknown> }[] | null) ?? []).map((r) => [r.key, r.value]),
  );
  const pub = (map.marketing ?? {}) as Record<string, unknown>;
  const sec = (map.marketing_secret ?? {}) as Record<string, unknown>;
  return {
    metaPixelId: safe(pub.meta_pixel_id, META_PIXEL_RE),
    tiktokPixelId: safe(pub.tiktok_pixel_id, TIKTOK_PIXEL_RE),
    ga4Id: safe(pub.ga4_id, GA4_RE),
    metaCapiToken: typeof sec.meta_capi_token === "string" ? sec.meta_capi_token : "",
  };
}

/** For the admin form: IDs plus whether a token is stored — never the token. */
export async function getMarketingAdmin(): Promise<MarketingPublic & { hasCapiToken: boolean }> {
  const { metaCapiToken, ...rest } = await getMarketingServer();
  return { ...rest, hasCapiToken: metaCapiToken.length > 0 };
}
