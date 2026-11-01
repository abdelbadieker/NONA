import { describe, expect, it } from "vitest";
import { deriveAdSource } from "@/lib/attribution";

describe("deriveAdSource", () => {
  it("prefers explicit UTM source", () => {
    expect(deriveAdSource({ utm_source: "ig", referrer: "https://m.facebook.com/" })).toBe("instagram");
    expect(deriveAdSource({ utm_source: "facebook_ads" })).toBe("facebook");
    expect(deriveAdSource({ utm_source: "newsletter" })).toBe("other");
  });

  it("falls back to click ids, then referrer hosts (as seen in the live analytics)", () => {
    expect(deriveAdSource({ fbclid: "x" })).toBe("facebook");
    expect(deriveAdSource({ ttclid: "x" })).toBe("tiktok");
    expect(deriveAdSource({ referrer: "https://lm.facebook.com/l.php?u=x" })).toBe("facebook");
    expect(deriveAdSource({ referrer: "https://l.instagram.com/" })).toBe("instagram");
    expect(deriveAdSource({ referrer: "https://web.telegram.org/" })).toBe("telegram");
    expect(deriveAdSource({ referrer: "https://mostaql.com/" })).toBe("other");
  });

  it("treats own-site and missing referrers as direct", () => {
    expect(deriveAdSource({ referrer: "https://nona-one.vercel.app/ar" }, "nona-one.vercel.app")).toBe("direct");
    expect(deriveAdSource({})).toBe("direct");
    expect(deriveAdSource(null)).toBe("direct");
    expect(deriveAdSource({ referrer: "not a url" })).toBe("direct");
  });
});
