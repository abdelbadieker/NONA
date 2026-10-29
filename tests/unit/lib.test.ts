import { describe, expect, it } from "vitest";
import { csvCell, parseCsv, toCsv } from "@/lib/csv";
import { can, isPermission } from "@/lib/permissions";
import { canTransition, ORDER_STATUSES } from "@/lib/order-status";
import { redact } from "@/lib/audit";
import {
  checkoutInputSchema,
  contactFormSchema,
  discountInputSchema,
  homeContentSchema,
  marketingInputSchema,
  newsletterSchema,
  productInputSchema,
  socialSettingsSchema,
  themeSchema,
} from "@/lib/validation";

describe("csv", () => {
  it("neutralises spreadsheet formula injection", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(csvCell("+213661")).toBe("'+213661");
    expect(csvCell("-5")).toBe("'-5");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("normal, with comma")).toBe('"normal, with comma"');
    expect(csvCell(null)).toBe("");
  });

  it("round-trips through the parser, including Arabic and quotes", () => {
    const csv = toCsv(
      [{ a: "فستان سهرة", b: 'say "hi"\nline2' }],
      [
        { header: "name", value: (r) => r.a },
        { header: "note", value: (r) => r.b },
      ],
    );
    expect(csv.startsWith("﻿")).toBe(true);
    expect(parseCsv(csv)).toEqual([["name", "note"], ["فستان سهرة", 'say "hi"\nline2']]);
  });
});

describe("permissions", () => {
  it("grants by explicit permission or wildcard only", () => {
    expect(can(["*"], "staff.manage")).toBe(true);
    expect(can(["orders.view"], "orders.view")).toBe(true);
    expect(can(["orders.view"], "orders.manage")).toBe(false);
    expect(can(null, "orders.view")).toBe(false);
    expect(isPermission("orders.refund")).toBe(true);
    expect(isPermission("orders.everything")).toBe(false);
  });
});

describe("order status map", () => {
  it("never allows jumping straight to delivered or reviving a returned order to delivered", () => {
    expect(canTransition("not_confirmed", "delivered")).toBe(false);
    expect(canTransition("returned", "delivered")).toBe(false);
    expect(canTransition("canceled", "confirmed")).toBe(false);
    expect(canTransition("confirmed", "confirmed")).toBe(true);
    expect(ORDER_STATUSES).toHaveLength(6);
  });
});

describe("audit redaction", () => {
  it("never logs credentials, even nested", () => {
    const out = redact({ meta_capi_token: "EAAB123", nested: { password: "x", ok: 1 }, plain: "keep" });
    expect(out).toEqual({ meta_capi_token: "[redacted]", nested: { password: "[redacted]", ok: 1 }, plain: "keep" });
  });
});

describe("validation — injection-prone settings", () => {
  it("only accepts strict hex colors for the theme (written into <style>)", () => {
    const ok = { blush: "#f5d0d5", blushDark: "#e8a9b2", gold: "#d4af37", ink: "#1a1a1a", background: "#ffffff" };
    expect(themeSchema.safeParse(ok).success).toBe(true);
    expect(themeSchema.safeParse({ ...ok, ink: "red;}</style><script>alert(1)</script>" }).success).toBe(false);
    expect(themeSchema.safeParse({ ...ok, ink: "#fff" }).success).toBe(false);
  });

  it("only accepts provider-shaped pixel IDs (written into inline scripts)", () => {
    const base = { metaPixelId: "", tiktokPixelId: "", ga4Id: "", metaCapiToken: "" };
    expect(marketingInputSchema.safeParse({ ...base, metaPixelId: "123456789012345" }).success).toBe(true);
    expect(marketingInputSchema.safeParse({ ...base, metaPixelId: "1');alert(1);//" }).success).toBe(false);
    expect(marketingInputSchema.safeParse({ ...base, tiktokPixelId: "C1ABCDEF2GHIJKLMN" }).success).toBe(true);
    expect(marketingInputSchema.safeParse({ ...base, ga4Id: "G-ABC123XYZ" }).success).toBe(true);
    expect(marketingInputSchema.safeParse({ ...base, ga4Id: "UA-123" }).success).toBe(false);
    expect(marketingInputSchema.safeParse({ ...base, metaCapiToken: "-" }).success).toBe(true);
  });

  it("rejects javascript: and plain-http social links, and non-https hero images", () => {
    expect(socialSettingsSchema.safeParse({ instagram: "javascript:alert(1)" }).success).toBe(false);
    expect(socialSettingsSchema.safeParse({ instagram: "http://instagram.com/nona" }).success).toBe(false);
    expect(socialSettingsSchema.safeParse({ instagram: "https://instagram.com/nona", whatsapp: "213661000000" }).success).toBe(true);
    expect(homeContentSchema.safeParse({ heroImage: "javascript:x", ar: {}, fr: {}, en: {} }).success).toBe(false);
  });
});

describe("validation — commerce", () => {
  const item = { variantId: "6f1c2a7e-0d1b-4c55-9a3e-2b6f0c1d2e3f", qty: 1 };
  const checkout = {
    items: [item],
    customerName: "Amina",
    customerPhone: "0661000000",
    wilayaCode: 16,
    address: "12 rue des Fleurs",
    deliveryType: "home" as const,
    locale: "ar" as const,
    idempotencyKey: "0b7e9c2a-4f1d-4e2b-8a6c-1d2e3f4a5b6c",
  };

  it("accepts a valid checkout and rejects bad phones, quantities and locales", () => {
    expect(checkoutInputSchema.safeParse(checkout).success).toBe(true);
    expect(checkoutInputSchema.safeParse({ ...checkout, customerPhone: "0461000000" }).success).toBe(false);
    expect(checkoutInputSchema.safeParse({ ...checkout, items: [{ ...item, qty: 0 }] }).success).toBe(false);
    expect(checkoutInputSchema.safeParse({ ...checkout, locale: "de" }).success).toBe(false);
    expect(checkoutInputSchema.safeParse({ ...checkout, utm: { evil_key: "x" } }).success).toBe(false);
  });

  it("enforces discount rules before they reach the database", () => {
    const base = { title: "Promo", kind: "percentage" as const, value: 10, code: "promo10" };
    const ok = discountInputSchema.safeParse(base);
    expect(ok.success && ok.data.code).toBe("PROMO10");
    expect(discountInputSchema.safeParse({ ...base, value: 150 }).success).toBe(false);
    expect(discountInputSchema.safeParse({ ...base, code: null }).success).toBe(false);
    expect(discountInputSchema.safeParse({ ...base, code: null, automatic: true }).success).toBe(true);
    expect(discountInputSchema.safeParse({ ...base, applies_to: "products", product_ids: [] }).success).toBe(false);
    expect(
      discountInputSchema.safeParse({
        ...base,
        starts_at: "2026-11-02T00:00:00Z",
        ends_at: "2026-11-01T00:00:00Z",
      }).success,
    ).toBe(false);
  });

  it("rejects products with duplicate variants or compare-at below price", () => {
    const p = {
      slug: "robe",
      name_ar: "فستان",
      price: 3000,
      is_active: true,
      is_featured: false,
      is_best_seller: false,
      images: [],
      variants: [{ size: "M", color: "Noir", stock: 1 }],
    };
    expect(productInputSchema.safeParse(p).success).toBe(true);
    expect(
      productInputSchema.safeParse({ ...p, variants: [...p.variants, { size: "M", color: "Noir", stock: 2 }] }).success,
    ).toBe(false);
    expect(productInputSchema.safeParse({ ...p, compare_at_price: 2000 }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...p, slug: "Robe Soirée" }).success).toBe(false);
  });

  it("requires explicit consent for the newsletter and a contact channel for forms", () => {
    expect(newsletterSchema.safeParse({ email: "a@b.dz", consent: false, locale: "ar" }).success).toBe(false);
    expect(newsletterSchema.safeParse({ email: "A@B.dz", consent: true, locale: "ar" }).success).toBe(true);
    const form = { form: "contact" as const, name: "Sara", message: "Bonjour !", locale: "fr" as const };
    expect(contactFormSchema.safeParse(form).success).toBe(false);
    expect(contactFormSchema.safeParse({ ...form, phone: "0550000000" }).success).toBe(true);
    expect(contactFormSchema.safeParse({ ...form, phone: "0550000000", website: "spam" }).success).toBe(false);
  });
});
