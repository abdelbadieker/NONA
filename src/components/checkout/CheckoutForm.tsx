"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShieldCheck } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { CheckoutText } from "@/i18n/checkout";
import type { DeliveryFee } from "@/lib/types";
import { createOrder } from "@/lib/actions/orders";
import { PHONE_RE } from "@/lib/validation";
import { trackInitiateCheckout } from "@/lib/pixel";
import { cn, formatPrice } from "@/lib/utils";

const SAVE_KEY = "nona_checkout";

type Props = {
  lang: Locale;
  t: CheckoutText;
  currency: string;
  product: { id: string; slug: string; name: string; image: string | null };
  variant: {
    id: string;
    size: string | null;
    color: string | null;
    stock: number;
    unitPrice: number;
  };
  initialQty: number;
  deliveryFees: DeliveryFee[];
};

export function CheckoutForm({
  lang,
  t,
  currency,
  product,
  variant,
  initialQty,
  deliveryFees,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [wilaya, setWilaya] = useState<number | "">("");
  const [commune, setCommune] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryType, setDeliveryType] = useState<"home" | "stopdesk">("home");
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState(Math.max(1, initialQty));
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Restore saved contact/delivery info
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.name) setName(s.name);
      if (s.phone) setPhone(s.phone);
      if (s.phone2) setPhone2(s.phone2);
      if (s.wilaya) setWilaya(s.wilaya);
      if (s.commune) setCommune(s.commune);
      if (s.address) setAddress(s.address);
      if (s.deliveryType) setDeliveryType(s.deliveryType);
      if (s.notes) setNotes(s.notes);
    } catch {}
  }, []);

  // Fire InitiateCheckout once on mount.
  useEffect(() => {
    trackInitiateCheckout({
      ids: [product.id],
      value: variant.unitPrice * initialQty,
      currency: "DZD",
      numItems: initialQty,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave (debounced)
  useEffect(() => {
    const id = setTimeout(() => {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          name,
          phone,
          phone2,
          wilaya,
          commune,
          address,
          deliveryType,
          notes,
        }),
      );
    }, 400);
    return () => clearTimeout(id);
  }, [name, phone, phone2, wilaya, commune, address, deliveryType, notes]);

  const maxQty = Math.max(1, variant.stock);
  const clampedQty = Math.min(Math.max(1, qty), maxQty);
  const feeRow = deliveryFees.find((f) => f.wilaya_code === wilaya);
  const deliveryFee = feeRow
    ? deliveryType === "home"
      ? feeRow.home_fee
      : feeRow.stopdesk_fee
    : null;
  const subtotal = variant.unitPrice * clampedQty;
  const total = subtotal + (deliveryFee ?? 0);

  const errors = {
    name: name.trim().length < 2 ? t.errName : null,
    phone: !PHONE_RE.test(phone.trim()) ? t.errPhone : null,
    wilaya: wilaya === "" ? t.errWilaya : null,
    address: address.trim().length < 5 ? t.errAddress : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const wilayaName = (f: DeliveryFee) =>
    lang === "ar" ? f.name_ar : (f.name_fr ?? f.name_ar);

  function onPlaceOrder() {
    setSubmitted(true);
    setServerError(null);
    if (hasErrors) {
      document
        .querySelector("[data-error='true']")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setConfirmOpen(true);
  }

  function onConfirm() {
    setConfirmOpen(false);
    startTransition(async () => {
      const res = await createOrder({
        productSlug: product.slug,
        variantId: variant.id,
        qty: clampedQty,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerPhone2: phone2.trim(),
        wilayaCode: Number(wilaya),
        commune: commune.trim(),
        address: address.trim(),
        deliveryType,
        notes: notes.trim(),
        locale: lang,
      });
      if (res.ok) {
        localStorage.removeItem(SAVE_KEY);
        try {
          sessionStorage.setItem(
            "nona_purchase",
            JSON.stringify({
              ids: [res.productId],
              value: res.value,
              currency: "DZD",
              numItems: clampedQty,
              eventId: res.eventId,
            }),
          );
        } catch {}
        router.push(`/${lang}/checkout/success?order=${res.orderNumber}`);
      } else {
        setServerError(res.error === "stock" ? t.errStock : t.errGeneric);
      }
    });
  }

  const fieldErr = (key: keyof typeof errors) =>
    submitted && errors[key] ? errors[key] : null;

  const variantBits = [variant.size, variant.color].filter(Boolean).join(" · ");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      {/* ---- Form ---- */}
      <div className="space-y-6">
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-base font-semibold text-ink">{t.contactInfo}</h2>
          <div className="mt-4 space-y-4">
            <Field label={t.fullName} error={fieldErr("name")}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.fullNamePlaceholder}
                autoComplete="name"
                className={inputCls(!!fieldErr("name"))}
              />
            </Field>
            <Field label={t.phone} error={fieldErr("phone")}>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.phonePlaceholder}
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                className={inputCls(!!fieldErr("phone"))}
              />
            </Field>
            <Field label={t.phone2}>
              <input
                value={phone2}
                onChange={(e) => setPhone2(e.target.value)}
                placeholder={t.phonePlaceholder}
                inputMode="tel"
                dir="ltr"
                className={inputCls(false)}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-base font-semibold text-ink">{t.deliveryInfo}</h2>
          <div className="mt-4 space-y-4">
            <Field label={t.wilaya} error={fieldErr("wilaya")}>
              <select
                value={wilaya}
                onChange={(e) =>
                  setWilaya(e.target.value ? Number(e.target.value) : "")
                }
                className={inputCls(!!fieldErr("wilaya"))}
              >
                <option value="">{t.selectWilaya}</option>
                {deliveryFees.map((f) => (
                  <option key={f.wilaya_code} value={f.wilaya_code}>
                    {f.wilaya_code} - {wilayaName(f)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t.deliveryType}>
              <div className="grid grid-cols-2 gap-3">
                {(["home", "stopdesk"] as const).map((dt) => {
                  const fee = feeRow
                    ? dt === "home"
                      ? feeRow.home_fee
                      : feeRow.stopdesk_fee
                    : null;
                  return (
                    <button
                      key={dt}
                      type="button"
                      onClick={() => setDeliveryType(dt)}
                      className={cn(
                        "rounded-xl border p-3 text-start transition-colors",
                        deliveryType === dt
                          ? "border-blush-dark bg-blush-light"
                          : "border-line bg-white hover:border-blush-dark",
                      )}
                    >
                      <span className="block text-sm font-medium text-ink">
                        {dt === "home" ? t.home : t.stopdesk}
                      </span>
                      {fee != null && (
                        <span className="mt-0.5 block text-xs text-muted">
                          {formatPrice(fee)} {currency}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label={t.commune}>
              <input
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                placeholder={t.communePlaceholder}
                className={inputCls(false)}
              />
            </Field>

            <Field label={t.address} error={fieldErr("address")}>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t.addressPlaceholder}
                rows={2}
                autoComplete="street-address"
                className={inputCls(!!fieldErr("address"))}
              />
            </Field>

            <Field label={t.notes}>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.notesPlaceholder}
                rows={2}
                className={inputCls(false)}
              />
            </Field>
          </div>
        </section>
      </div>

      {/* ---- Summary ---- */}
      <aside className="lg:sticky lg:top-20 lg:h-fit">
        <div className="rounded-2xl border border-line bg-cream p-5">
          <h2 className="text-base font-semibold text-ink">{t.orderSummary}</h2>

          <div className="mt-4 flex gap-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-blush-light">
              {product.image && (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium text-ink">
                {product.name}
              </p>
              {variantBits && (
                <p className="mt-0.5 text-xs text-muted">{variantBits}</p>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-ink">{t.quantity}</span>
            <div className="flex items-center rounded-lg border border-line bg-white">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={clampedQty <= 1}
                aria-label="-"
                className="grid size-8 place-items-center disabled:opacity-30"
              >
                <Minus className="size-4" aria-hidden />
              </button>
              <span className="w-8 text-center text-sm font-semibold">
                {clampedQty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                disabled={clampedQty >= maxQty}
                aria-label="+"
                className="grid size-8 place-items-center disabled:opacity-30"
              >
                <Plus className="size-4" aria-hidden />
              </button>
            </div>
          </div>

          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">{t.subtotal}</dt>
              <dd className="font-medium text-ink">
                {formatPrice(subtotal)} {currency}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{t.deliveryFee}</dt>
              <dd className="font-medium text-ink">
                {deliveryFee != null ? `${formatPrice(deliveryFee)} ${currency}` : "—"}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base">
              <dt className="font-semibold text-ink">{t.total}</dt>
              <dd className="font-bold text-ink">
                {formatPrice(total)} {currency}
              </dd>
            </div>
          </dl>

          {serverError && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {serverError}
            </p>
          )}

          <button
            type="button"
            onClick={onPlaceOrder}
            disabled={pending}
            className="mt-4 w-full rounded-full bg-ink px-6 py-3.5 text-base font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-60"
          >
            {pending ? t.submitting : t.placeOrder}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
            <ShieldCheck className="size-4 text-green-600" aria-hidden />
            {t.successNote}
          </p>
        </div>
      </aside>

      {/* ---- Confirm modal ---- */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <h3 className="text-lg font-bold text-ink">{t.confirmTitle}</h3>
            <p className="mt-2 text-sm text-muted">{t.confirmText}</p>
            <div className="mt-4 space-y-1 rounded-xl bg-cream p-3 text-start text-sm">
              <p className="font-medium text-ink">{name}</p>
              <p className="text-muted" dir="ltr">
                {phone}
              </p>
              <p className="text-muted">
                {feeRow ? wilayaName(feeRow) : ""} — {address}
              </p>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-full border border-line py-3 text-sm font-semibold text-ink"
              >
                {t.confirmEdit}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 rounded-full bg-ink py-3 text-sm font-semibold text-white"
              >
                {t.confirmYes}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="block" data-error={!!error}>
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

function inputCls(error: boolean) {
  return cn(
    "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-blush-dark",
    error ? "border-red-400" : "border-line",
  );
}
