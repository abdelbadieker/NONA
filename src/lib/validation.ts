import { z } from "zod";
import { PERMISSIONS } from "@/lib/permissions";
import { CALL_OUTCOMES, DELIVERY_FAILURE_REASONS } from "@/lib/order-status";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Algerian mobile: 0 + (5|6|7) + 8 digits
export const PHONE_RE = /^0[5-7]\d{8}$/;
export const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;
export const META_PIXEL_RE = /^\d{6,20}$/;
export const TIKTOK_PIXEL_RE = /^[A-Z0-9]{10,32}$/i;
export const GA4_RE = /^G-[A-Z0-9]{4,15}$/i;
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const uuid = z.string().regex(UUID);
const localeEnum = z.enum(["ar", "fr", "en"]);
const nullableStr = (max: number) => z.string().trim().max(max).nullable().optional();
const optionalPhone = z.string().trim().regex(PHONE_RE).optional().or(z.literal(""));
const httpsUrl = z.string().trim().url().regex(/^https:\/\//).max(500);
const money = z.number().finite().min(0).max(100_000_000);

// ── Checkout ─────────────────────────────────────────────
export const cartItemSchema = z.object({
  variantId: uuid,
  qty: z.number().int().min(1).max(99),
});

const utmSchema = z
  .record(
    z.string().regex(/^(utm_(source|medium|campaign|content|term)|fbclid|ttclid|gclid|referrer|landing|lp)$/),
    z.string().max(300),
  )
  .optional();

export const quoteInputSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(20),
  wilayaCode: z.number().int().min(1).max(58).nullable().optional(),
  deliveryType: z.enum(["home", "stopdesk"]).default("home"),
  discountCode: z.string().trim().max(32).optional().or(z.literal("")),
  locale: localeEnum,
});
export type QuoteInput = z.input<typeof quoteInputSchema>;

export const checkoutInputSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(20),
  customerName: z.string().trim().min(2).max(80),
  customerPhone: z.string().trim().regex(PHONE_RE),
  customerPhone2: optionalPhone,
  wilayaCode: z.number().int().min(1).max(58),
  commune: z.string().trim().max(80).optional().or(z.literal("")),
  address: z.string().trim().min(5).max(300),
  deliveryType: z.enum(["home", "stopdesk"]),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  discountCode: z.string().trim().max(32).optional().or(z.literal("")),
  acceptsMarketing: z.boolean().optional(),
  locale: localeEnum,
  idempotencyKey: uuid,
  utm: utmSchema,
  source: z.enum(["cart", "buy_now", "landing"]).optional(),
});
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

/** Abandoned-checkout lead (sent from the checkout once name + phone are valid). */
export const leadInputSchema = z.object({
  customerName: z.string().trim().min(2).max(80),
  customerPhone: z.string().trim().regex(PHONE_RE),
  wilayaCode: z.number().int().min(1).max(58).nullable().optional(),
  commune: z.string().trim().max(80).optional().or(z.literal("")),
  productSlug: z.string().trim().max(120).optional(),
  productName: z.string().trim().max(160).optional(),
  locale: localeEnum,
  utm: utmSchema,
});

export const reviewInputSchema = z.object({
  productId: uuid.nullable(),
  customerName: z.string().trim().min(2).max(60),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(1000).optional().or(z.literal("")),
  /** Honeypot. */
  website: z.string().max(0).optional().or(z.literal("")),
});

export const pageViewSchema = z.object({
  path: z.string().max(300).regex(/^\/(ar|fr|en)(\/|$)/),
  sessionId: z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
  referrer: z.string().max(500).optional(),
});

export const trackOrderSchema = z.object({
  orderNumber: z.coerce.number().int().min(1).max(1_000_000_000),
  phone: z.string().trim().regex(PHONE_RE),
});

// ── Product (admin) ──────────────────────────────────────
const localized = <T extends z.ZodTypeAny>(shape: T) =>
  z.object({ ar: shape.optional(), fr: shape.optional(), en: shape.optional() });

export const productSeoSchema = localized(
  z.object({ title: z.string().trim().max(70).optional(), description: z.string().trim().max(170).optional() }),
);
export const productDetailsSchema = localized(
  z.object({
    material: z.string().trim().max(300).optional(),
    care: z.string().trim().max(600).optional(),
    fit: z.string().trim().max(300).optional(),
    size_guide: z.string().trim().max(2000).optional(),
    model: z.string().trim().max(300).optional(),
  }),
);

export const productVariantInputSchema = z.object({
  id: uuid.optional(),
  size: nullableStr(20),
  color: nullableStr(40),
  color_hex: z.string().trim().regex(HEX_COLOR_RE).nullable().optional(),
  sku: z.string().trim().regex(/^[A-Za-z0-9._-]{1,64}$/).nullable().optional(),
  barcode: z.string().trim().regex(/^[0-9A-Za-z-]{4,32}$/).nullable().optional(),
  price_override: money.nullable().optional(),
  cost_price: money.nullable().optional(),
  image_url: z.string().trim().regex(/^https?:\/\//).max(500).nullable().optional(),
  stock: z.number().int().min(0).max(100000),
  /** Stock the editor saw when the form loaded (existing variants only). */
  expected_stock: z.number().int().min(0).max(100000).nullable().optional(),
});

export const productInputSchema = z
  .object({
    id: uuid.optional(),
    slug: z.string().trim().min(1).max(120).regex(SLUG_RE),
    category_id: uuid.nullable().optional(),
    name_ar: z.string().trim().min(1).max(160),
    name_fr: nullableStr(160),
    name_en: nullableStr(160),
    description_ar: nullableStr(5000),
    description_fr: nullableStr(5000),
    description_en: nullableStr(5000),
    price: money,
    compare_at_price: money.nullable().optional(),
    cost_price: money.nullable().optional(),
    vendor: nullableStr(80),
    product_type: nullableStr(80),
    tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
    weight_grams: z.number().int().min(0).max(100000).nullable().optional(),
    internal_notes: nullableStr(2000),
    seo: productSeoSchema.default({}),
    details: productDetailsSchema.default({}),
    is_active: z.boolean(),
    is_featured: z.boolean(),
    is_best_seller: z.boolean(),
    delivery_days_min: z.number().int().min(0).max(365).nullable().optional(),
    delivery_days_max: z.number().int().min(0).max(365).nullable().optional(),
    images: z.array(z.string().trim().regex(/^https?:\/\//).max(500)).max(15),
    variants: z.array(productVariantInputSchema).min(1).max(100),
  })
  .refine((p) => p.compare_at_price == null || p.compare_at_price >= p.price, {
    path: ["compare_at_price"],
    message: "compare_at_below_price",
  })
  .refine(
    (p) =>
      p.delivery_days_min == null ||
      p.delivery_days_max == null ||
      p.delivery_days_max >= p.delivery_days_min,
    { path: ["delivery_days_max"], message: "delivery_range" },
  )
  .refine(
    (p) => {
      const keys = p.variants.map((v) => `${v.size ?? ""}|${v.color ?? ""}`);
      return new Set(keys).size === keys.length;
    },
    { path: ["variants"], message: "duplicate_variant" },
  );

export type ProductInput = z.input<typeof productInputSchema>;
export type ProductVariantInput = z.input<typeof productVariantInputSchema>;

// ── Inventory ────────────────────────────────────────────
export const INVENTORY_REASONS = ["received", "correction", "damaged", "count", "returned", "other"] as const;
export const inventoryAdjustSchema = z.object({
  variantId: uuid,
  delta: z.number().int().min(-100000).max(100000).refine((d) => d !== 0),
  reason: z.enum(INVENTORY_REASONS),
  note: z.string().trim().max(500).optional(),
  expected: z.number().int().min(0).nullable().optional(),
});

// ── Store settings ───────────────────────────────────────
export const themeSchema = z.object({
  blush: z.string().regex(HEX_COLOR_RE),
  blushDark: z.string().regex(HEX_COLOR_RE),
  gold: z.string().regex(HEX_COLOR_RE),
  ink: z.string().regex(HEX_COLOR_RE),
  background: z.string().regex(HEX_COLOR_RE),
});

const heroLocaleSchema = z.object({
  badge: z.string().trim().max(60).optional(),
  title: z.string().trim().max(120).optional(),
  subtitle: z.string().trim().max(300).optional(),
  cta: z.string().trim().max(40).optional(),
  announcement: z.string().trim().max(160).optional(),
});

export const homeContentSchema = z.object({
  heroImage: z.string().trim().regex(/^https:\/\//).max(500).or(z.literal("")),
  ar: heroLocaleSchema,
  fr: heroLocaleSchema,
  en: heroLocaleSchema,
});

export const storeSettingsSchema = z.object({
  name: z.string().trim().max(60).optional().default(""),
  phone: z.string().trim().regex(/^\+?[0-9 ]{6,20}$/).optional().or(z.literal("")),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(60).optional().or(z.literal("")),
});

export const socialSettingsSchema = z.object({
  instagram: httpsUrl.optional().or(z.literal("")),
  facebook: httpsUrl.optional().or(z.literal("")),
  tiktok: httpsUrl.optional().or(z.literal("")),
  whatsapp: z.string().trim().regex(/^\+?[0-9]{8,15}$/).optional().or(z.literal("")),
});

export const deliverySettingsSchema = z.object({
  freeThreshold: money,
  defaultDaysMin: z.number().int().min(0).max(60),
  defaultDaysMax: z.number().int().min(0).max(60),
});

export const marketingInputSchema = z.object({
  metaPixelId: z.string().trim().regex(META_PIXEL_RE).or(z.literal("")),
  tiktokPixelId: z.string().trim().regex(TIKTOK_PIXEL_RE).or(z.literal("")),
  ga4Id: z.string().trim().regex(GA4_RE).or(z.literal("")),
  /** Empty = keep the stored token; "-" = remove it. */
  metaCapiToken: z
    .string()
    .trim()
    .regex(/^([A-Za-z0-9_-]{20,512}|-)$/)
    .or(z.literal("")),
});

export const deliveryFeeRowSchema = z.object({
  id: uuid,
  home_fee: money,
  stopdesk_fee: money,
  is_active: z.boolean(),
  home_enabled: z.boolean(),
  stopdesk_enabled: z.boolean(),
});

// ── Discounts ────────────────────────────────────────────
export const discountInputSchema = z
  .object({
    id: uuid.optional(),
    code: z
      .string()
      .trim()
      .transform((s) => s.toUpperCase())
      .pipe(z.string().regex(/^[A-Z0-9_-]{3,32}$/))
      .nullable()
      .optional(),
    title: z.string().trim().min(1).max(80),
    kind: z.enum(["percentage", "fixed", "free_shipping"]),
    value: money,
    min_subtotal: money.default(0),
    min_quantity: z.number().int().min(0).max(999).default(0),
    applies_to: z.enum(["all", "products", "categories"]).default("all"),
    product_ids: z.array(uuid).max(200).default([]),
    category_ids: z.array(uuid).max(50).default([]),
    starts_at: z.string().datetime({ offset: true }).nullable().optional(),
    ends_at: z.string().datetime({ offset: true }).nullable().optional(),
    usage_limit: z.number().int().min(1).max(1_000_000).nullable().optional(),
    once_per_customer: z.boolean().default(false),
    automatic: z.boolean().default(false),
    is_active: z.boolean().default(true),
  })
  .refine((d) => (d.automatic ? !d.code : !!d.code), { path: ["code"], message: "code_required" })
  .refine((d) => d.kind !== "percentage" || (d.value > 0 && d.value <= 100), {
    path: ["value"],
    message: "percentage_range",
  })
  .refine((d) => d.kind !== "fixed" || d.value > 0, { path: ["value"], message: "value_required" })
  .refine((d) => !d.starts_at || !d.ends_at || new Date(d.ends_at) > new Date(d.starts_at), {
    path: ["ends_at"],
    message: "date_range",
  })
  .refine((d) => d.applies_to !== "products" || d.product_ids.length > 0, {
    path: ["product_ids"],
    message: "products_required",
  })
  .refine((d) => d.applies_to !== "categories" || d.category_ids.length > 0, {
    path: ["category_ids"],
    message: "categories_required",
  });
export type DiscountInput = z.input<typeof discountInputSchema>;

// ── Orders (admin) ───────────────────────────────────────
export const orderNoteSchema = z.object({
  orderId: uuid,
  message: z.string().trim().min(1).max(1000),
});
export const callLogSchema = z.object({
  orderId: uuid,
  outcome: z.enum(CALL_OUTCOMES),
  note: z.string().trim().max(500).optional(),
});
export const shipmentSchema = z.object({
  orderId: uuid,
  carrier: z.string().trim().max(60),
  trackingNumber: z.string().trim().max(80),
});
export const deliveryAttemptSchema = z.object({
  orderId: uuid,
  reason: z.enum(DELIVERY_FAILURE_REASONS),
  note: z.string().trim().max(500).optional(),
});
export const codUpdateSchema = z.object({
  orderId: uuid,
  action: z.enum(["collected", "settled", "refunded"]),
  amount: money.optional(),
});
export const orderFlagSchema = z.object({
  orderId: uuid,
  flagged: z.boolean(),
  reason: z.string().trim().max(200).optional(),
});
export const orderDetailsSchema = z.object({
  orderId: uuid,
  customerName: z.string().trim().min(2).max(80),
  customerPhone: z.string().trim().regex(PHONE_RE),
  customerPhone2: optionalPhone,
  commune: z.string().trim().max(80).optional().or(z.literal("")),
  address: z.string().trim().min(5).max(300),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
});

// ── Customers (admin) ────────────────────────────────────
export const customerUpdateSchema = z.object({
  id: uuid,
  fullName: z.string().trim().max(80).optional().or(z.literal("")),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(30)).max(20).default([]),
});

// ── Content pages ────────────────────────────────────────
export const pageInputSchema = z.object({
  id: uuid.optional(),
  slug: z.string().trim().min(2).max(80).regex(SLUG_RE),
  title_ar: z.string().trim().min(1).max(120),
  title_fr: nullableStr(120),
  title_en: nullableStr(120),
  body_ar: nullableStr(20000),
  body_fr: nullableStr(20000),
  body_en: nullableStr(20000),
  seo: productSeoSchema.default({}),
  is_published: z.boolean(),
  show_in_footer: z.boolean(),
  position: z.number().int().min(0).max(999).default(0),
});
export type PageInput = z.input<typeof pageInputSchema>;

// ── Public forms ─────────────────────────────────────────
export const contactFormSchema = z
  .object({
    form: z.enum(["contact", "wholesale"]),
    name: z.string().trim().min(2).max(80),
    phone: optionalPhone,
    email: z.string().trim().email().max(120).optional().or(z.literal("")),
    message: z.string().trim().min(5).max(2000),
    locale: localeEnum,
    /** Honeypot: real users never fill this hidden field. */
    website: z.string().max(0).optional().or(z.literal("")),
  })
  .refine((f) => !!f.phone || !!f.email, { path: ["phone"], message: "contact_required" });

export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  consent: z.literal(true),
  locale: localeEnum,
  website: z.string().max(0).optional().or(z.literal("")),
});

// ── Staff ────────────────────────────────────────────────
export const staffUpdateSchema = z.object({
  id: uuid,
  roleKey: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
  isActive: z.boolean(),
  fullName: z.string().trim().max(80).optional().or(z.literal("")),
});
export const staffInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  fullName: z.string().trim().max(80).optional().or(z.literal("")),
  roleKey: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
});
export const roleInputSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
  name_ar: z.string().trim().min(1).max(60),
  name_fr: nullableStr(60),
  name_en: nullableStr(60),
  permissions: z.array(z.enum(PERMISSIONS)).max(PERMISSIONS.length),
});
