// Ad-source attribution (pure). Explicit tags win over click ids, which win
// over the referrer; everything else is "direct".

export type Attribution = Partial<
  Record<
    | "utm_source"
    | "utm_medium"
    | "utm_campaign"
    | "utm_content"
    | "utm_term"
    | "fbclid"
    | "ttclid"
    | "gclid"
    | "referrer"
    | "landing",
    string
  >
>;

export const AD_SOURCES = ["facebook", "instagram", "tiktok", "google", "telegram", "whatsapp", "other", "direct"] as const;
export type AdSource = (typeof AD_SOURCES)[number];

const BY_NAME: [RegExp, AdSource][] = [
  [/^(ig|insta|instagram)/i, "instagram"],
  [/^(fb|facebook|meta)/i, "facebook"],
  [/^(tt|tiktok)/i, "tiktok"],
  [/^(google|adwords|gads)/i, "google"],
  [/^(tg|telegram)/i, "telegram"],
  [/^(wa|whatsapp)/i, "whatsapp"],
];

const BY_HOST: [RegExp, AdSource][] = [
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, "facebook"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)google\.[a-z.]+$/, "google"],
  [/(^|\.)(telegram\.org|t\.me)$/, "telegram"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "whatsapp"],
];

export function deriveAdSource(a: Attribution | null | undefined, ownHost?: string): AdSource {
  if (!a) return "direct";
  const src = a.utm_source?.trim();
  if (src) return BY_NAME.find(([re]) => re.test(src))?.[1] ?? "other";
  if (a.fbclid) return "facebook";
  if (a.ttclid) return "tiktok";
  if (a.gclid) return "google";
  if (a.referrer) {
    let host = "";
    try {
      host = new URL(a.referrer).hostname.toLowerCase();
    } catch {
      return "direct";
    }
    if (ownHost && host === ownHost.toLowerCase()) return "direct";
    return BY_HOST.find(([re]) => re.test(host))?.[1] ?? "other";
  }
  return "direct";
}
