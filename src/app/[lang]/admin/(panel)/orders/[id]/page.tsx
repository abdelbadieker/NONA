import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { adminText } from "@/i18n/admin";
import { adminOpsText } from "@/i18n/admin-ops";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getOrderDetail } from "@/lib/data/admin-ops";
import { getActiveReasons } from "@/lib/data/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { OrderStatusControl } from "@/components/admin/OrderStatusControl";
import { CallLogger, CodPanel, DetailsEditor, FlagAndAssign, NoteForm, ShipmentForm } from "@/components/admin/OrderPanels";
import { Badge, Card, NoAccess, PageHeader, fmtDate } from "@/components/admin/ui";
import { formatPrice, pickLocale } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

function Row({ label, value, ltr }: { label: string; value: React.ReactNode; ltr?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-end font-medium text-ink" dir={ltr ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}

export default async function AdminOrderDetail({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const t = adminText[lang];
  const ops = adminOpsText[lang];
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "orders.view")) return <NoAccess t={ops.common} />;

  const data = await getOrderDetail(id);
  if (!data) notFound();
  const { order, items, events, staff: staffList } = data;
  const status = order.status as OrderStatus;
  const canManage = can(staff.permissions, "orders.manage");
  const currency = lang === "ar" ? "دج" : "DA";
  const money = (v: unknown) => `${formatPrice(Number(v) || 0)} ${currency}`;
  const actor = (aid: string | null) => (aid ? (staffList.find((s) => s.id === aid)?.label ?? aid.slice(0, 8)) : ops.orders.system);

  const [cancellationReasons, returnReasons] = await Promise.all([
    getActiveReasons("cancellation"),
    getActiveReasons("return"),
  ]);
  const reasonLabel = (rid: unknown) => {
    const r = [...cancellationReasons, ...returnReasons].find((x) => x.id === rid);
    return r ? pickLocale(r, "label", lang) : null;
  };

  const o = order as Record<string, unknown>;
  const str = (k: string) => (o[k] == null ? "" : String(o[k]));
  const utm = (o.utm ?? null) as Record<string, string> | null;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        back={{ href: `/${lang}/admin/orders`, label: t.orders.back }}
        title={`${t.orders.order} #${order.order_number}`}
        subtitle={fmtDate(order.created_at, true)}
        actions={
          <>
            <Badge tone={["collected", "settled"].includes(str("payment_status")) ? "green" : str("payment_status") === "refunded" ? "red" : "neutral"}>
              {ops.orders.paymentStatus[str("payment_status")] ?? str("payment_status")}
            </Badge>
            <StatusBadge status={status} label={t.status[status]} />
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          {canManage && (
            <Card title={t.orders.changeStatus}>
              <OrderStatusControl
                orderId={order.id}
                current={status}
                lang={lang}
                t={t.orders}
                ops={ops}
                statusLabels={t.status}
                cancellationReasons={cancellationReasons}
                returnReasons={returnReasons}
                canManage={canManage}
              />
            </Card>
          )}

          {canManage && ["not_confirmed", "confirmed"].includes(status) && (
            <Card title={ops.orders.confirmation}>
              <CallLogger
                orderId={order.id}
                lang={lang}
                ops={ops}
                attempts={Number(o.call_attempts ?? 0)}
                last={(o.last_call_outcome as string) ?? null}
              />
            </Card>
          )}

          <Card title={t.orders.items} bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 p-4 text-sm">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-blush-light">
                    {it.image_url && <Image src={it.image_url} alt="" fill sizes="48px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{it.product_name}</p>
                    <p className="text-xs text-muted">
                      {[it.variant_label, it.sku && `SKU ${it.sku}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-ink">
                      {it.quantity} × {formatPrice(Number(it.unit_price))}
                    </p>
                    <p className="font-semibold text-ink">{money(it.line_total)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="space-y-1 border-t border-line p-4">
              <Row label={t.orders.subtotal} value={money(order.subtotal)} />
              {Number(o.discount_amount) > 0 && (
                <Row label={`${ops.orders.discount}${o.discount_code ? ` (${o.discount_code})` : ""}`} value={`−${money(o.discount_amount)}`} />
              )}
              <Row label={t.orders.deliveryFee} value={money(order.delivery_fee)} />
              <div className="flex justify-between gap-4 border-t border-line pt-2 text-base">
                <dt className="font-semibold text-ink">{t.orders.total}</dt>
                <dd className="font-bold text-ink">{money(order.total)}</dd>
              </div>
            </dl>
          </Card>

          {(["confirmed", "in_delivery", "delivered", "returned"] as string[]).includes(status) && (
            <Card title={ops.orders.shipment}>
              {canManage ? (
                <ShipmentForm
                  orderId={order.id}
                  lang={lang}
                  ops={ops}
                  carrier={(o.carrier as string) ?? null}
                  trackingNumber={(o.tracking_number as string) ?? null}
                  status={status}
                  attempts={Number(o.delivery_attempts ?? 0)}
                />
              ) : (
                <dl>
                  <Row label={ops.orders.carrier} value={str("carrier") || "—"} />
                  <Row label={ops.orders.trackingNumber} value={str("tracking_number") || "—"} ltr />
                </dl>
              )}
            </Card>
          )}

          {(["in_delivery", "delivered", "returned"] as string[]).includes(status) && canManage && (
            <Card title={ops.orders.cod}>
              <CodPanel
                orderId={order.id}
                lang={lang}
                ops={ops}
                status={status}
                paymentStatus={str("payment_status")}
                total={Number(order.total)}
                collected={o.cod_collected_amount == null ? null : Number(o.cod_collected_amount)}
                currency={currency}
                canRefund={can(staff.permissions, "orders.refund")}
              />
            </Card>
          )}

          <Card title={ops.orders.timeline}>
            {canManage && (
              <div className="mb-4">
                <NoteForm orderId={order.id} lang={lang} ops={ops} />
              </div>
            )}
            <ol className="space-y-3 border-s border-line ps-4">
              {events.map((e) => {
                const d = e.data ?? {};
                let detail: string | null = null;
                if (e.type === "status")
                  detail = `${t.status[d.from as OrderStatus] ?? d.from} → ${t.status[d.to as OrderStatus] ?? d.to}${
                    reasonLabel(d.reason_id) ? ` · ${reasonLabel(d.reason_id)}` : ""
                  }`;
                else if (e.type === "call") detail = ops.orders.callOutcomes[String(d.outcome)] ?? String(d.outcome);
                else if (e.type === "delivery_attempt") detail = ops.orders.failureReasons[String(d.reason)] ?? String(d.reason);
                else if (e.type === "payment") detail = ops.orders.paymentStatus[String(d.action)] ?? String(d.action);
                else if (e.type === "shipment") detail = [d.carrier, d.tracking_number].filter(Boolean).join(" · ");
                else if (e.type === "flag") detail = d.flagged ? ops.orders.flag : ops.orders.unflag;
                else if (e.type === "edit") detail = (d.fields as string[] | undefined)?.join(", ") ?? null;
                else if (e.type === "created" && d.flag) detail = ops.orders.flagReasons[String(d.flag)] ?? String(d.flag);
                return (
                  <li key={e.id} className="relative text-sm">
                    <span className="absolute -start-[1.4rem] top-1.5 size-2 rounded-full bg-blush-dark" aria-hidden />
                    <p className="font-medium text-ink">
                      {ops.orders.events[e.type] ?? e.type}
                      {detail && <span className="font-normal text-muted"> · {detail}</span>}
                    </p>
                    {e.message && <p className="whitespace-pre-line text-ink">{e.message}</p>}
                    <p className="text-xs text-muted">
                      {fmtDate(e.created_at, true)} · {actor(e.actor_id)}
                    </p>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title={t.orders.customer}>
            <dl>
              <Row label={t.orders.customer} value={order.customer_name} />
              <Row label={t.orders.phone} value={<a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a>} ltr />
              {order.customer_phone2 && <Row label={t.orders.phone} value={order.customer_phone2} ltr />}
              <Row label={t.orders.deliveryType} value={order.delivery_type === "home" ? t.orders.home : t.orders.stopdesk} />
              <Row label={t.orders.wilaya} value={`${order.wilaya_code} · ${order.wilaya_name ?? ""}`} />
              {order.commune && <Row label={t.orders.commune} value={order.commune} />}
              <Row label={t.orders.address} value={order.address} />
            </dl>
            {order.notes && (
              <p className="mt-2 rounded-lg bg-cream p-2 text-sm">
                <span className="font-semibold text-ink">{t.orders.notes}: </span>
                <span className="text-muted">{order.notes}</span>
              </p>
            )}
            {((o.tags as string[]) ?? []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {(o.tags as string[]).map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-col gap-2">
              {Boolean(o.customer_id) && can(staff.permissions, "customers.view") && (
                <Link href={`/${lang}/admin/customers/${o.customer_id}`} className="text-sm font-medium text-blush-dark hover:underline">
                  {ops.orders.viewCustomer}
                </Link>
              )}
              {canManage && !["delivered", "returned"].includes(status) && (
                <DetailsEditor
                  orderId={order.id}
                  lang={lang}
                  ops={ops}
                  labels={{ name: t.orders.customer, phone: t.orders.phone, commune: t.orders.commune, address: t.orders.address, notes: t.orders.notes }}
                  initial={{
                    customerName: order.customer_name,
                    customerPhone: order.customer_phone,
                    customerPhone2: order.customer_phone2 ?? "",
                    commune: order.commune ?? "",
                    address: order.address,
                    notes: order.notes ?? "",
                    tags: (o.tags as string[]) ?? [],
                  }}
                />
              )}
            </div>
          </Card>

          {canManage && (
            <Card title={ops.orders.assignedTo}>
              <FlagAndAssign
                orderId={order.id}
                lang={lang}
                ops={ops}
                flagged={Boolean(o.flagged)}
                flagReason={(o.flag_reason as string) ?? null}
                assignedTo={(o.assigned_to as string) ?? null}
                staff={staffList}
              />
            </Card>
          )}

          {(utm || Boolean(o.source)) && (
            <Card title={ops.orders.source}>
              <dl className="text-xs">
                {Boolean(o.source) && <Row label="source" value={str("source")} ltr />}
                {utm &&
                  Object.entries(utm).map(([k, v]) => <Row key={k} label={k} value={v} ltr />)}
              </dl>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
