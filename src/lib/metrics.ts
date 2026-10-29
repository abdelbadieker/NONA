// Dashboard metrics — pure functions over order rows, so every formula is
// testable and documented (see docs/data-model.md → "Metric definitions").
import type { OrderStatus } from "@/lib/types";

export type MetricOrder = {
  status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  total: number;
  created_at: string;
};

export type Metrics = {
  orders: number;
  /** Σ subtotal of non-canceled orders (merchandise at list price). */
  grossSales: number;
  /** Σ discount_amount of non-canceled orders. */
  discounts: number;
  /** Σ (subtotal − discount) of returned orders. */
  returns: number;
  /** grossSales − discounts − returns. */
  netSales: number;
  /** Σ total (incl. delivery fee) of delivered orders = cash collected. */
  deliveredRevenue: number;
  /** (grossSales − discounts) / non-canceled orders. */
  aov: number | null;
  /** reached confirmation / orders already decided (everything but not_confirmed). */
  confirmationRate: number | null;
  /** canceled / decided orders. */
  cancelRate: number | null;
  /** delivered / (delivered + returned). */
  deliveryRate: number | null;
  /** returned / (delivered + returned). */
  returnRate: number | null;
  byStatus: Record<OrderStatus, number>;
};

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

export function computeMetrics(orders: readonly MetricOrder[]): Metrics {
  const byStatus: Record<OrderStatus, number> = {
    not_confirmed: 0,
    confirmed: 0,
    in_delivery: 0,
    delivered: 0,
    returned: 0,
    canceled: 0,
  };
  let grossSales = 0;
  let discounts = 0;
  let returns = 0;
  let deliveredRevenue = 0;

  for (const o of orders) {
    byStatus[o.status] += 1;
    const subtotal = Number(o.subtotal) || 0;
    const discount = Number(o.discount_amount) || 0;
    if (o.status !== "canceled") {
      grossSales += subtotal;
      discounts += discount;
    }
    if (o.status === "returned") returns += subtotal - discount;
    if (o.status === "delivered") deliveredRevenue += Number(o.total) || 0;
  }

  const nonCanceled = orders.length - byStatus.canceled;
  const decided = orders.length - byStatus.not_confirmed;
  const reachedConfirmation =
    byStatus.confirmed + byStatus.in_delivery + byStatus.delivered + byStatus.returned;
  const shippedOutcome = byStatus.delivered + byStatus.returned;

  return {
    orders: orders.length,
    grossSales,
    discounts,
    returns,
    netSales: grossSales - discounts - returns,
    deliveredRevenue,
    aov: nonCanceled > 0 ? (grossSales - discounts) / nonCanceled : null,
    confirmationRate: ratio(reachedConfirmation, decided),
    cancelRate: ratio(byStatus.canceled, decided),
    deliveryRate: ratio(byStatus.delivered, shippedOutcome),
    returnRate: ratio(byStatus.returned, shippedOutcome),
    byStatus,
  };
}

/** Inclusive start of a "last N days" window, at local midnight. */
export function rangeStart(days: number, now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}
