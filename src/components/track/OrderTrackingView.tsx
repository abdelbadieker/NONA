import { CheckCircle2, Circle, XCircle } from "lucide-react";
import type { StoreText } from "@/i18n/store";
import type { TrackedOrder } from "@/lib/data/tracking";
import { cn, formatPrice } from "@/lib/utils";

const fmt = (iso: string | null, locale: string) =>
  iso
    ? new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : locale === "fr" ? "fr-DZ" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        numberingSystem: "latn",
      }).format(new Date(iso))
    : null;

export function OrderTrackingView({
  order,
  t,
  currency,
  locale,
}: {
  order: TrackedOrder;
  t: StoreText["track"];
  currency: string;
  locale: string;
}) {
  const ended = order.status === "canceled" || order.status === "returned";
  const reached = {
    placed: true,
    confirmed: ["confirmed", "in_delivery", "delivered"].includes(order.status) || !!order.confirmedAt,
    shipped: ["in_delivery", "delivered"].includes(order.status),
    delivered: order.status === "delivered",
  };
  const steps = [
    { key: "placed", label: t.steps.placed, at: order.createdAt, done: reached.placed },
    { key: "confirmed", label: t.steps.confirmed, at: order.confirmedAt, done: reached.confirmed },
    { key: "shipped", label: t.steps.shipped, at: order.shippedAt, done: reached.shipped },
    { key: "delivered", label: t.steps.delivered, at: order.deliveredAt, done: reached.delivered },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-2xl bg-cream p-4">
        <span className="text-lg font-bold text-ink" dir="ltr">
          #{order.orderNumber}
        </span>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-sm font-semibold",
            ended ? "bg-red-100 text-red-700" : order.status === "delivered" ? "bg-green-100 text-green-700" : "bg-blush-light text-ink",
          )}
        >
          {t.status[order.status]}
        </span>
      </div>

      {ended ? (
        <p className="flex items-center gap-2 rounded-xl border border-line p-4 text-sm text-ink">
          <XCircle className="size-5 text-red-500" aria-hidden />
          {order.status === "canceled" ? t.canceled : t.returned}
        </p>
      ) : (
        <ol className="space-y-0">
          {steps.map((s, i) => (
            <li key={s.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                {s.done ? (
                  <CheckCircle2 className="size-6 text-green-600" aria-hidden />
                ) : (
                  <Circle className="size-6 text-line" aria-hidden />
                )}
                {i < steps.length - 1 && <span className={cn("w-0.5 flex-1", s.done ? "bg-green-600" : "bg-line")} />}
              </div>
              <div className="pb-5">
                <p className={cn("text-sm font-semibold", s.done ? "text-ink" : "text-muted")}>{s.label}</p>
                {s.done && s.at && <p className="text-xs text-muted">{fmt(s.at, locale)}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}

      {(order.carrier || order.trackingNumber) && (
        <dl className="grid grid-cols-2 gap-3 rounded-xl border border-line p-4 text-sm">
          {order.carrier && (
            <div>
              <dt className="text-muted">{t.carrier}</dt>
              <dd className="font-medium text-ink">{order.carrier}</dd>
            </div>
          )}
          {order.trackingNumber && (
            <div>
              <dt className="text-muted">{t.trackingNumber}</dt>
              <dd className="font-medium text-ink" dir="ltr">
                {order.trackingNumber}
              </dd>
            </div>
          )}
        </dl>
      )}

      <div className="rounded-xl border border-line p-4">
        <h2 className="mb-2 text-sm font-semibold text-ink">{t.items}</h2>
        <ul className="divide-y divide-line text-sm">
          {order.items.map((it, i) => (
            <li key={i} className="flex justify-between gap-3 py-2">
              <span className="text-ink">
                {it.name}
                {it.variantLabel && <span className="text-muted"> · {it.variantLabel}</span>}
                <span className="text-muted"> × {it.qty}</span>
              </span>
              <span className="shrink-0 font-medium text-ink">
                {formatPrice(it.lineTotal)} {currency}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-1 border-t border-line pt-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{t.subtotal}</dt>
            <dd>{formatPrice(order.subtotal)} {currency}</dd>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-green-700">
              <dt>{t.discount}</dt>
              <dd>−{formatPrice(order.discountAmount)} {currency}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">
              {t.deliveryFee} ({order.deliveryType === "home" ? t.home : t.stopdesk}
              {order.wilayaName ? ` · ${order.wilayaName}` : ""})
            </dt>
            <dd>{formatPrice(order.deliveryFee)} {currency}</dd>
          </div>
          <div className="flex justify-between font-bold text-ink">
            <dt>{t.total}</dt>
            <dd>{formatPrice(order.total)} {currency}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
