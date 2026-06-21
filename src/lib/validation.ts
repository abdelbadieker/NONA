import { z } from "zod";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Algerian mobile: 0 + (5|6|7) + 8 digits
export const PHONE_RE = /^0[5-7]\d{8}$/;

const optionalPhone = z
  .string()
  .trim()
  .regex(PHONE_RE)
  .optional()
  .or(z.literal(""));

export const orderInputSchema = z.object({
  productSlug: z.string().min(1),
  variantId: z.string().regex(UUID),
  qty: z.number().int().min(1).max(99),
  customerName: z.string().trim().min(2).max(80),
  customerPhone: z.string().trim().regex(PHONE_RE),
  customerPhone2: optionalPhone,
  wilayaCode: z.number().int().min(1).max(58),
  commune: z.string().trim().max(80).optional().or(z.literal("")),
  address: z.string().trim().min(5).max(300),
  deliveryType: z.enum(["home", "stopdesk"]),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  locale: z.string().max(5),
});

export type OrderInput = z.infer<typeof orderInputSchema>;

// ── Product (admin) ──────────────────────────────────────
const nullableStr = (max: number) =>
  z.string().trim().max(max).nullable().optional();

export const productVariantInputSchema = z.object({
  id: z.string().regex(UUID).optional(),
  size: nullableStr(20),
  color: nullableStr(40),
  color_hex: nullableStr(9),
  stock: z.number().int().min(0).max(100000),
  price_override: z.number().min(0).nullable().optional(),
});

export const productInputSchema = z.object({
  id: z.string().regex(UUID).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  category_id: z.string().regex(UUID).nullable().optional(),
  name_ar: z.string().trim().min(1).max(160),
  name_fr: nullableStr(160),
  name_en: nullableStr(160),
  description_ar: nullableStr(2000),
  description_fr: nullableStr(2000),
  description_en: nullableStr(2000),
  price: z.number().min(0).max(100000000),
  compare_at_price: z.number().min(0).max(100000000).nullable().optional(),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  is_best_seller: z.boolean(),
  delivery_days_min: z.number().int().min(0).max(365).nullable().optional(),
  delivery_days_max: z.number().int().min(0).max(365).nullable().optional(),
  images: z
    .array(z.string().trim().regex(/^https?:\/\//))
    .max(10),
  variants: z.array(productVariantInputSchema).min(1).max(50),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductVariantInput = z.infer<typeof productVariantInputSchema>;
