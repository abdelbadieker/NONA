import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { adminText } from "@/i18n/admin";
import { getActiveReasons, getOrderById } from "@/lib/data/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { OrderStatusControl } from "@/components/admin/OrderStatusControl";
import { formatPrice } from "@/lib/utils";

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("fr-DZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  const data = await getOrderById(id);
  if (!data) notFound();
  const { order, items } = data;

  const t = adminText[lang];
  const currency = lang === "ar" ? "دج" : "DA";
  const Back = lang === "ar" ? ArrowRight : ArrowLeft;

  const [cancellationReasons, returnReasons] = await Promise.all([
    getActiveReasons("cancellation"),
    getActiveReasons("return"),
  ]);

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-end font-medium text-ink">{value}</dd>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href={`/${lang}/admin/orders`}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-blush-dark"
      >
        <Back className="size-4" aria-hidden />
        {t.orders.back}
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">
          {t.orders.order} #{order.order_number}
        </h1>
        <StatusBadge status={order.status} label={t.status[order.status]} />
      </div>
      <p className="-mt-3 text-xs text-muted">{fmt(order.created_at)}</p>

      <OrderStatusControl
        orderId={order.id}
        current={order.status}
        lang={lang}
        t={t.orders}
        statusLabels={t.status}
        cancellationReasons={cancellationReasons}
        returnReasons={returnReasons}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">
            {t.orders.customer}
          </h2>
          <dl>
            <Row label={t.orders.customer} value={order.customer_name} />
            <Row label={t.orders.phone} value={order.customer_phone} />
            {order.customer_phone2 && (
              <Row label={t.orders.phone} value={order.customer_phone2} />
            )}
          </dl>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">
            {t.orders.deliveryType}
          </h2>
          <dl>
            <Row
              label={t.orders.deliveryType}
              value={order.delivery_type === "home" ? t.orders.home : t.orders.stopdesk}
            />
            <Row label={t.orders.wilaya} value={order.wilaya_name ?? ""} />
            {order.commune && (
              <Row label={t.orders.commune} value={order.commune} />
            )}
            <Row label={t.orders.address} value={order.address} />
          </dl>
        </div>
      </div>

      {order.notes && (
        <div className="rounded-2xl border border-line bg-white p-4 text-sm">
          <span className="font-semibold text-ink">{t.orders.notes}: </span>
          <span className="text-muted">{order.notes}</span>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink">{t.orders.items}</h2>
        <ul className="divide-y divide-line">
          {items.map((it) => (
            <li key={it.id} className="flex justify-between gap-3 py-2 text-sm">
              <div>
                <p className="font-medium text-ink">{it.product_name}</p>
                {it.variant_label && (
                  <p className="text-xs text-muted">{it.variant_label}</p>
                )}
              </div>
              <div className="text-end">
                <p className="text-ink">
                  {it.quantity} × {formatPrice(it.unit_price)}
                </p>
                <p className="font-semibold text-ink">
                  {formatPrice(it.line_total)} {currency}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-line pt-3">
          <Row
            label={t.orders.subtotal}
            value={`${formatPrice(order.subtotal)} ${currency}`}
          />
          <Row
            label={t.orders.deliveryFee}
            value={`${formatPrice(order.delivery_fee)} ${currency}`}
          />
          <div className="flex justify-between gap-4 border-t border-line pt-2 text-base">
            <dt className="font-semibold text-ink">{t.orders.total}</dt>
            <dd className="font-bold text-ink">
              {formatPrice(order.total)} {currency}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
