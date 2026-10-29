import { describe, expect, it } from "vitest";
import { computeMetrics, rangeStart, type MetricOrder } from "@/lib/metrics";

const o = (status: MetricOrder["status"], subtotal: number, discount = 0, fee = 500): MetricOrder => ({
  status,
  subtotal,
  discount_amount: discount,
  total: subtotal - discount + fee,
  created_at: "2026-10-01T10:00:00Z",
});

describe("computeMetrics", () => {
  it("returns nulls (not zeros) for rates without data", () => {
    const m = computeMetrics([]);
    expect(m.orders).toBe(0);
    expect(m.aov).toBeNull();
    expect(m.confirmationRate).toBeNull();
    expect(m.deliveryRate).toBeNull();
  });

  it("separates gross, discounts, returns and delivered cash", () => {
    const m = computeMetrics([
      o("delivered", 5000, 500),
      o("delivered", 3000),
      o("returned", 2000, 200),
      o("canceled", 9000),
      o("not_confirmed", 1000),
      o("in_delivery", 4000),
    ]);
    expect(m.orders).toBe(6);
    expect(m.grossSales).toBe(5000 + 3000 + 2000 + 1000 + 4000); // canceled excluded
    expect(m.discounts).toBe(700);
    expect(m.returns).toBe(1800);
    expect(m.netSales).toBe(15000 - 700 - 1800);
    expect(m.deliveredRevenue).toBe(4500 + 500 + 3000 + 500); // incl. delivery fee
    expect(m.aov).toBeCloseTo((15000 - 700) / 5);
  });

  it("computes COD funnel rates on the right denominators", () => {
    const m = computeMetrics([
      o("not_confirmed", 1),
      o("confirmed", 1),
      o("in_delivery", 1),
      o("delivered", 1),
      o("delivered", 1),
      o("delivered", 1),
      o("returned", 1),
      o("canceled", 1),
      o("canceled", 1),
    ]);
    // decided = 8 (all but not_confirmed); reached confirmation = 6
    expect(m.confirmationRate).toBeCloseTo(6 / 8);
    expect(m.cancelRate).toBeCloseTo(2 / 8);
    // shipped outcome = delivered 3 + returned 1
    expect(m.deliveryRate).toBeCloseTo(3 / 4);
    expect(m.returnRate).toBeCloseTo(1 / 4);
  });

  it("builds a last-N-days window starting at midnight", () => {
    const start = rangeStart(7, new Date("2026-10-29T15:30:00"));
    expect(start.getDate()).toBe(23);
    expect(start.getHours()).toBe(0);
  });
});
