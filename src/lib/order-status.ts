// Order lifecycle (client-safe mirror of private.order_transition_allowed in
// supabase/migrations/0004_commerce_core.sql — the database enforces it).
import type { OrderStatus } from "@/lib/types";

export const ORDER_STATUSES: OrderStatus[] = [
  "not_confirmed",
  "confirmed",
  "in_delivery",
  "delivered",
  "returned",
  "canceled",
];

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  not_confirmed: ["confirmed", "canceled"],
  confirmed: ["in_delivery", "canceled", "not_confirmed"],
  in_delivery: ["delivered", "returned", "confirmed"],
  delivered: ["returned", "in_delivery"],
  returned: ["in_delivery"],
  canceled: ["not_confirmed"],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return from === to || ORDER_TRANSITIONS[from].includes(to);
}

/** Statuses during which the order's stock is committed (decremented). */
export const STOCK_HOLDING: OrderStatus[] = ["confirmed", "in_delivery", "delivered"];

export type PaymentStatus = "pending" | "collected" | "settled" | "refunded" | "voided";
export const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "collected", "settled", "refunded", "voided"];

export const CALL_OUTCOMES = [
  "confirmed",
  "no_answer",
  "busy",
  "call_back",
  "wrong_number",
  "refused",
] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export const DELIVERY_FAILURE_REASONS = [
  "no_answer",
  "refused",
  "absent",
  "wrong_address",
  "postponed",
  "other",
] as const;
