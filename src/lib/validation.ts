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
