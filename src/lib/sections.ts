// Homepage section model (client-safe). The homepage is an ordered list of
// sections the owner can add, remove, hide, duplicate, reorder and style.
import { z } from "zod";

const hexOrEmpty = z.string().regex(/^#[0-9a-f]{6}$/i).or(z.literal(""));
const localized = (max: number) =>
  z
    .object({
      ar: z.string().trim().max(max).optional(),
      fr: z.string().trim().max(max).optional(),
      en: z.string().trim().max(max).optional(),
    })
    .default({});
const httpsOrEmpty = z.string().trim().regex(/^https:\/\/[^\s"'<>]+$/).max(600).or(z.literal(""));
/** Internal paths only (/shop, /ar/product/x…) or https links. */
const link = z
  .string()
  .trim()
  .max(300)
  .regex(/^(\/[A-Za-z0-9/_?=&.-]*|https:\/\/[^\s"'<>]+)?$/)
  .default("");

const base = {
  id: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/),
  enabled: z.boolean().default(true),
  background: hexOrEmpty.default(""),
  textColor: hexOrEmpty.default(""),
};

export const SECTION_TYPES = ["hero", "products", "categories", "banner", "text", "trust", "reviews", "faq", "newsletter"] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export const sectionSchema = z.discriminatedUnion("type", [
  z.object({
    ...base,
    type: z.literal("hero"),
    badge: localized(60),
    title: localized(120),
    subtitle: localized(300),
    cta: localized(40),
    image: httpsOrEmpty.default(""),
    ctaLink: link,
  }),
  z.object({
    ...base,
    type: z.literal("products"),
    title: localized(80),
    source: z.enum(["best_sellers", "featured", "new", "category"]).default("new"),
    category: z.string().regex(/^[a-z0-9-]*$/).max(80).default(""),
    limit: z.number().int().min(2).max(24).default(10),
  }),
  z.object({ ...base, type: z.literal("categories"), title: localized(80) }),
  z.object({
    ...base,
    type: z.literal("banner"),
    image: httpsOrEmpty.default(""),
    link,
    alt: localized(200),
    rounded: z.boolean().default(true),
  }),
  z.object({
    ...base,
    type: z.literal("text"),
    title: localized(120),
    body: localized(2000),
    align: z.enum(["start", "center"]).default("center"),
  }),
  z.object({ ...base, type: z.literal("trust") }),
  z.object({ ...base, type: z.literal("reviews"), title: localized(80), limit: z.number().int().min(1).max(12).default(6) }),
  z.object({ ...base, type: z.literal("faq"), title: localized(80) }),
  z.object({ ...base, type: z.literal("newsletter"), title: localized(80), text: localized(200) }),
]);
export type Section = z.infer<typeof sectionSchema>;
export type SectionInput = z.input<typeof sectionSchema>;
export const sectionsSchema = z
  .array(sectionSchema)
  .max(40)
  .refine((s) => new Set(s.map((x) => x.id)).size === s.length, { message: "duplicate_ids" });

/** Builds a section of `type` with defaults (used by "Add section"). */
export function newSection(type: SectionType, id = Math.random().toString(36).slice(2, 10)): Section {
  return sectionSchema.parse({ id, type });
}

/** The original homepage, expressed as sections (keeps the site identical). */
export const DEFAULT_SECTIONS: Section[] = [
  newSection("hero", "hero"),
  sectionSchema.parse({ id: "best", type: "products", source: "best_sellers" }),
  newSection("categories", "categories"),
  sectionSchema.parse({ id: "featured", type: "products", source: "featured" }),
  sectionSchema.parse({ id: "new", type: "products", source: "new" }),
  newSection("reviews", "reviews"),
  newSection("faq", "faq"),
];

/** Lenient read: invalid sections are dropped, unknown → default layout. */
export function readSections(raw: unknown): Section[] {
  if (!Array.isArray(raw)) return DEFAULT_SECTIONS;
  const out: Section[] = [];
  const ids = new Set<string>();
  for (const s of raw) {
    const r = sectionSchema.safeParse(s);
    if (r.success && !ids.has(r.data.id)) {
      ids.add(r.data.id);
      out.push(r.data);
    }
  }
  return out;
}

export function pickText(t: { ar?: string; fr?: string; en?: string } | undefined, lang: string): string {
  if (!t) return "";
  return (t as Record<string, string | undefined>)[lang] || t.ar || "";
}
