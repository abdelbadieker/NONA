import { describe, expect, it } from "vitest";
import { DEFAULT_LANDING_FORM, landingInputSchema, readBlocks, readForm, slugify } from "@/lib/landing";
import { DEFAULT_SECTIONS, newSection, pickText, readSections, sectionSchema, sectionsSchema } from "@/lib/sections";

const lp = {
  title: "Robe princesse",
  slug: "robe-princesse",
  productId: "6f1c2a7e-0d1b-4c55-9a3e-2b6f0c1d2e3f",
  locale: "ar" as const,
  status: "published" as const,
  blocks: [
    { id: "a", type: "image" as const, url: "https://x.supabase.co/a.webp", width: 1080, height: 4000 },
    { id: "f", type: "form" as const },
  ],
  form: { buttonColor: "#e11d48" },
  seo: {},
};

describe("landing page schema", () => {
  it("accepts a valid page and fills form defaults", () => {
    const r = landingInputSchema.safeParse(lp);
    expect(r.success).toBe(true);
    expect(r.success && r.data.form.buttonShape).toBe("pill");
  });

  it("requires exactly one order form and unique block ids", () => {
    expect(landingInputSchema.safeParse({ ...lp, blocks: [lp.blocks[0]] }).success).toBe(false);
    expect(landingInputSchema.safeParse({ ...lp, blocks: [...lp.blocks, { id: "g", type: "form" }] }).success).toBe(false);
    expect(landingInputSchema.safeParse({ ...lp, blocks: [lp.blocks[0], { ...lp.blocks[0] }, lp.blocks[1]] }).success).toBe(false);
  });

  it("rejects script-injection in colours, image URLs and slugs", () => {
    expect(landingInputSchema.safeParse({ ...lp, form: { buttonColor: "red;background:url(x)" } }).success).toBe(false);
    expect(
      landingInputSchema.safeParse({ ...lp, blocks: [{ id: "a", type: "image", url: "javascript:alert(1)" }, lp.blocks[1]] }).success,
    ).toBe(false);
    expect(
      landingInputSchema.safeParse({ ...lp, blocks: [{ id: "a", type: "image", url: 'https://x/a.png" onerror="x' }, lp.blocks[1]] }).success,
    ).toBe(false);
    expect(landingInputSchema.safeParse({ ...lp, slug: "Robe Princesse!" }).success).toBe(false);
  });

  it("reads stored data leniently so a bad value never breaks a live page", () => {
    const blocks = readBlocks([{ id: "x", type: "image", url: "ftp://nope" }, { id: "t", type: "text", text: "Promo" }]);
    expect(blocks.map((b) => b.type)).toEqual(["text", "form"]); // bad image dropped, form guaranteed
    const form = readForm({ buttonColor: "not-a-color", buttonText: "اطلبي الآن", showNotes: true });
    expect(form.buttonColor).toBe(DEFAULT_LANDING_FORM.buttonColor);
    expect(form.buttonText).toBe("اطلبي الآن");
    expect(form.showNotes).toBe(true);
    expect(readForm(null)).toEqual(DEFAULT_LANDING_FORM);
  });

  it("makes URL-safe slugs", () => {
    expect(slugify("Robe Été — Rose 2026")).toBe("robe-ete-rose-2026");
    expect(slugify("فستان الأميرات")).toMatch(/^lp-[a-z0-9]+$/);
  });
});

describe("homepage sections", () => {
  it("default layout reproduces the original homepage order", () => {
    expect(DEFAULT_SECTIONS.map((s) => (s.type === "products" ? `products:${s.source}` : s.type))).toEqual([
      "hero",
      "products:best_sellers",
      "categories",
      "products:featured",
      "products:new",
      "reviews",
      "faq",
    ]);
    expect(sectionsSchema.safeParse(DEFAULT_SECTIONS).success).toBe(true);
  });

  it("validates links, colours and images per section", () => {
    expect(sectionSchema.safeParse({ id: "b", type: "banner", image: "https://x/a.jpg", link: "/shop?category=robes" }).success).toBe(true);
    expect(sectionSchema.safeParse({ id: "b", type: "banner", link: "javascript:alert(1)" }).success).toBe(false);
    expect(sectionSchema.safeParse({ id: "h", type: "hero", background: "#zzzzzz" }).success).toBe(false);
    expect(sectionsSchema.safeParse([newSection("faq", "x"), newSection("trust", "x")]).success).toBe(false);
  });

  it("reads stored layouts leniently and falls back to the default", () => {
    expect(readSections(null)).toBe(DEFAULT_SECTIONS);
    const read = readSections([{ id: "a", type: "text", body: { ar: "مرحبا" } }, { id: "z", type: "unknown" }, { id: "a", type: "faq" }]);
    expect(read).toHaveLength(1);
    expect(pickText(read[0].type === "text" ? read[0].body : undefined, "fr")).toBe("مرحبا"); // falls back to Arabic
  });
});
