// Landing-page model (client-safe): blocks + order-form design. Inputs are
// validated strictly on save; stored data is read leniently (invalid fields
// fall back to defaults) so a bad value can never break a live ad page.
import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const blockId = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/);
const httpsUrl = z.string().trim().regex(/^https:\/\/[^\s"'<>]+$/).max(600);

export const landingBlockSchema = z.discriminatedUnion("type", [
  z.object({
    id: blockId,
    type: z.literal("image"),
    url: httpsUrl,
    width: z.number().int().min(1).max(20000).optional(),
    height: z.number().int().min(1).max(40000).optional(),
    alt: z.string().trim().max(200).optional(),
  }),
  z.object({
    id: blockId,
    type: z.literal("text"),
    text: z.string().max(2000),
    align: z.enum(["start", "center"]).default("center"),
    size: z.enum(["sm", "md", "lg", "xl"]).default("md"),
    color: hex.or(z.literal("")).default(""),
    background: hex.or(z.literal("")).default(""),
  }),
  z.object({ id: blockId, type: z.literal("form") }),
]);
export type LandingBlock = z.infer<typeof landingBlockSchema>;

export const landingFormSchema = z.object({
  heading: z.string().trim().max(120).default(""),
  buttonText: z.string().trim().max(60).default(""),
  buttonColor: hex.default("#1a1a1a"),
  buttonTextColor: hex.default("#ffffff"),
  buttonSize: z.enum(["md", "lg", "xl"]).default("lg"),
  buttonShape: z.enum(["square", "rounded", "pill"]).default("pill"),
  animateButton: z.boolean().default(true),
  accentColor: hex.default("#e8a9b2"),
  formBackground: hex.default("#ffffff"),
  pageBackground: hex.default("#ffffff"),
  showPrice: z.boolean().default(true),
  showQuantity: z.boolean().default(true),
  showPhone2: z.boolean().default(false),
  showCommune: z.boolean().default(true),
  showNotes: z.boolean().default(false),
  stickyCta: z.boolean().default(true),
  stickyText: z.string().trim().max(60).default(""),
  showHeader: z.boolean().default(true),
});
export type LandingForm = z.infer<typeof landingFormSchema>;
export const DEFAULT_LANDING_FORM: LandingForm = landingFormSchema.parse({});

export const landingInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  productId: z.string().uuid().nullable(),
  locale: z.enum(["ar", "fr", "en"]),
  status: z.enum(["draft", "published"]),
  blocks: z
    .array(landingBlockSchema)
    .min(1)
    .max(60)
    .refine((b) => b.filter((x) => x.type === "form").length === 1, { message: "one_form" })
    .refine((b) => new Set(b.map((x) => x.id)).size === b.length, { message: "duplicate_ids" }),
  form: landingFormSchema,
  seo: z.object({
    title: z.string().trim().max(70).default(""),
    description: z.string().trim().max(170).default(""),
  }),
});
export type LandingInput = z.input<typeof landingInputSchema>;

/** Lenient read of stored blocks: drops invalid blocks, guarantees one form. */
export function readBlocks(raw: unknown): LandingBlock[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: LandingBlock[] = [];
  for (const b of list) {
    const r = landingBlockSchema.safeParse(b);
    if (r.success && !(r.data.type === "form" && out.some((x) => x.type === "form"))) out.push(r.data);
  }
  if (!out.some((b) => b.type === "form")) out.push({ id: "form", type: "form" });
  return out;
}

/** Lenient read of stored form settings: each invalid field falls back. */
export function readForm(raw: unknown): LandingForm {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = { ...DEFAULT_LANDING_FORM };
  for (const [k, schema] of Object.entries(landingFormSchema.shape)) {
    if (k in src) {
      const r = (schema as z.ZodTypeAny).safeParse(src[k]);
      if (r.success) out[k] = r.data;
    }
  }
  return out as LandingForm;
}

/** URL-safe handle from a title (Latin letters/digits; Arabic → random). */
export function slugify(title: string): string {
  const s = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || `lp-${Math.random().toString(36).slice(2, 8)}`;
}

export function newBlockId(): string {
  return Math.random().toString(36).slice(2, 10);
}
