import { describe, expect, it } from "vitest";
import { resolveVariant, sizeAvailable } from "@/lib/variants";

const v = (size: string | null, color: string | null, stock = 5) => ({ size, color, stock });

describe("resolveVariant", () => {
  // Mirrors live product robe-m31t: one colour sized "Standard", others unsized.
  const mixed = [v("Standard", "اصفر"), v(null, "اخضر"), v(null, "اسود"), v(null, "بني")];

  it("finds unsized colour variants even when a size is selected", () => {
    expect(resolveVariant(mixed, "Standard", "اسود").variant).toMatchObject({ color: "اسود", size: null });
    expect(resolveVariant(mixed, "Standard", "اصفر").variant).toMatchObject({ color: "اصفر", size: "Standard" });
    expect(resolveVariant(mixed, null, "بني")).toMatchObject({ needsSize: false, variant: { color: "بني" } });
  });

  it("still requires a choice when every variant for that colour is sized", () => {
    const sized = [v("S", "Noir"), v("M", "Noir"), v("M", "Rouge")];
    expect(resolveVariant(sized, null, "Noir")).toMatchObject({ needsSize: true, variant: undefined });
    expect(resolveVariant(sized, "M", null)).toMatchObject({ needsColor: true, variant: undefined });
    expect(resolveVariant(sized, "M", "Rouge").variant).toMatchObject({ size: "M", color: "Rouge" });
    expect(resolveVariant(sized, "S", "Rouge").variant).toBeUndefined();
  });

  it("handles products without options and prefers exact matches", () => {
    expect(resolveVariant([v(null, null)], null, null).variant).toMatchObject({ size: null, color: null });
    const both = [v(null, "Noir", 1), v("M", "Noir", 2)];
    expect(resolveVariant(both, "M", "Noir").variant?.stock).toBe(2);
  });

  it("marks sizes available when an unsized variant of the colour is in stock", () => {
    expect(sizeAvailable(mixed, "Standard", "اسود")).toBe(true);
    expect(sizeAvailable([v("S", "Noir", 0)], "S", "Noir")).toBe(false);
  });
});
