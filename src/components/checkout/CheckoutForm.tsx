"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShieldCheck, Tag, Trash2, X } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { CheckoutText } from "@/i18n/checkout";
import type { StoreText } from "@/i18n/store";
import type { DeliveryFee } from "@/lib/types";
import { placeOrder, quoteCart, type Quote } from "@/lib/actions/orders";
import { useCart, type CartItem } from "@/lib/cart";
import { PHONE_RE } from "@/lib/validation";
import { trackInitiateCheckout } from "@/lib/pixel";
import { cn, formatPrice, interpolate } from "@/lib/utils";

const SAVE_KEY = "nona_checkout";

type Mode = "cart" | "buy_now";
type QuoteState = {
  key: string;
  quote: Quote | null;
  error: string | null;
  variantId?: string;
  available?: number;
};

function newKey() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16),
      );
}

function readSaved(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function readUtm(): Record<string, string> | undefined {
  try {
    const raw = sessionStorage.getItem("nona_utm");
    return raw ? (JSON.parse(raw) as Record<string, string>) : undefined;
  } catch {
    return undefined;
  }
}

export function CheckoutForm({
  lang,
  t,
  st,
  currency,
  mode,
  buyNowItems,
  deliveryFees,
}: {
  lang: Locale;
  t: CheckoutText;
  st: StoreText;
  currency: string;
  mode: Mode;
  buyNowItems: CartItem[];
  deliveryFees: DeliveryFee[];
}) {
  const router = useRouter();
  const cart = useCart();
  const [pending, startTransition] = useTransition();
  const [buyItems, setBuyItems] = useState<CartItem[]>(buyNowItems);
  const items = mode === "cart" ? cart.items : buyItems;
  // Render only after hydration: the form starts from saved browser data.
  const ready = cart.ready;

  // Saved contact details: lazy init on the client only (no setState in effects).
  const [saved] = useState(() => (typeof window === "undefined" ? {} : readSaved()));
  const [name, setName] = useState(saved.name ?? "");
  const [phone, setPhone] = useState(saved.phone ?? "");
  const [phone2, setPhone2] = useState(saved.phone2 ?? "");
  const [wilaya, setWilaya] = useState<number | "">(saved.wilaya ? Number(saved.wilaya) : "");
  const [commune, setCommune] = useState(saved.commune ?? "");
  const [address, setAddress] = useState(saved.address ?? "");
  const [deliveryType, setDeliveryType] = useState<"home" | "stopdesk">(
    saved.deliveryType === "stopdesk" ? "stopdesk" : "home",
  );
  const [notes, setNotes] = useState(saved.notes ?? "");
  const [marketing, setMarketing] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(newKey);
  const [quoteState, setQuoteState] = useState<QuoteState | null>(null);
  const initiated = useRef(false);

  // Autosave contact/delivery info (debounced) — convenience for returning shoppers.
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(
          SAVE_KEY,
          JSON.stringify({ name, phone, phone2, wilaya, commune, address, deliveryType, notes }),
        );
      } catch {}
    }, 400);
    return () => clearTimeout(id);
  }, [name, phone, phone2, wilaya, commune, address, deliveryType, notes]);

  const quoteKey = useMemo(
    () =>
      JSON.stringify([
        items.map((i) => [i.variantId, i.qty]),
        wilaya,
        deliveryType,
        appliedCode,
      ]),
    [items, wilaya, deliveryType, appliedCode],
  );

  // Authoritative quote from the server whenever inputs change.
  useEffect(() => {
    if (!ready || !items.length) return;
    let cancelled = false;
    const id = setTimeout(async () => {
      const res = await quoteCart({
        items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
        wilayaCode: wilaya === "" ? null : wilaya,
        deliveryType,
        discountCode: appliedCode,
        locale: lang,
      });
      if (cancelled) return;
      if (res.ok) {
        setQuoteState({ key: quoteKey, quote: res.quote, error: null });
        if (!initiated.current) {
          initiated.current = true;
          trackInitiateCheckout({
            ids: [...new Set(res.quote.lines.map((l) => l.productId))],
            value: res.quote.subtotal,
            currency: "DZD",
            numItems: res.quote.itemCount,
          });
        }
      } else {
        setQuoteState({
          key: quoteKey,
          quote: null,
          error: res.error,
          variantId: res.variantId,
          available: res.available,
        });
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [quoteKey, ready, items, wilaya, deliveryType, appliedCode, lang]);

  const quoting = !!items.length && quoteState?.key !== quoteKey;
  const quote = quoteState?.quote ?? null;
  const quoteError = quoteState?.key === quoteKey ? quoteState.error : null;
  const discountError = quote?.discountError ?? null;

  const errors = {
    name: name.trim().length < 2 ? t.errName : null,
    phone: !PHONE_RE.test(phone.trim()) ? t.errPhone : null,
    phone2: phone2.trim() && !PHONE_RE.test(phone2.trim()) ? t.errPhone : null,
    wilaya: wilaya === "" ? t.errWilaya : null,
    address: address.trim().length < 5 ? t.errAddress : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const fieldErr = (key: keyof typeof errors) => (submitted && errors[key] ? errors[key] : null);

  const wilayaName = (f: DeliveryFee) => (lang === "ar" ? f.name_ar : (f.name_fr ?? f.name_ar));
  const feeRow = deliveryFees.find((f) => f.wilaya_code === wilaya);

  function setQty(variantId: string, qty: number) {
    setServerError(null);
    if (mode === "cart") cart.setQty(variantId, qty);
    else setBuyItems((prev) => prev.map((i) => (i.variantId === variantId ? { ...i, qty } : i)).filter((i) => i.qty > 0));
  }

  function onPlaceOrder() {
    setSubmitted(true);
    setServerError(null);
    if (hasErrors) {
      document.querySelector("[data-error='true']")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!quote || quoting || quoteError || discountError) return;
    setConfirmOpen(true);
  }

  function onConfirm() {
    setConfirmOpen(false);
    startTransition(async () => {
      const res = await placeOrder({
        items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerPhone2: phone2.trim(),
        wilayaCode: Number(wilaya),
        commune: commune.trim(),
        address: address.trim(),
        deliveryType,
        notes: notes.trim(),
        discountCode: appliedCode,
        acceptsMarketing: marketing,
        locale: lang,
        idempotencyKey,
        utm: readUtm(),
        source: mode,
      });
      if (res.ok) {
        try {
          localStorage.removeItem(SAVE_KEY);
          sessionStorage.setItem(
            "nona_purchase",
            JSON.stringify({
              ids: res.productIds,
              value: res.value,
              currency: "DZD",
              numItems: res.numItems,
              eventId: res.eventId,
            }),
          );
        } catch {}
        if (mode === "cart") cart.clear();
        router.push(`/${lang}/checkout/success?order=${res.orderNumber}&t=${res.publicToken}`);
        return;
      }
      // A definitive rejection: the next attempt is a new order request.
      if (res.error !== "generic") setIdempotencyKey(newKey());
      const msg: Record<string, string> = {
        stock: t.errStock,
        unavailable: st.checkout.unavailableItem,
        wilaya: st.checkout.wilayaUnavailable,
        rate: st.checkout.rate,
        discount: st.discount.errors[res.reason ?? "invalid"] ?? st.discount.errors.invalid,
      };
      setServerError(msg[res.error] ?? t.errGeneric);
    });
  }

  if (!ready) {
    return <div className="h-96 animate-pulse rounded-2xl bg-cream" aria-busy="true" />;
  }

  if (!items.length) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 py-16 text-center">
        <h2 className="text-xl font-bold text-ink">{t.emptyTitle}</h2>
        <p className="text-muted">{t.emptyText}</p>
        <Link href={`/${lang}/shop`} className="mt-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white">
          {t.goShop}
        </Link>
      </div>
    );
  }

  const quoteErrorText =
    quoteError === "out_of_stock" || quoteError === "invalid_qty"
      ? t.errStock
      : quoteError === "unavailable"
        ? st.cart.unavailable
        : quoteError === "wilaya_unavailable" || quoteError === "delivery_type_unavailable"
          ? st.checkout.wilayaUnavailable
          : quoteError === "rate"
            ? st.checkout.rate
            : quoteError
              ? t.errGeneric
              : null;

  const lines = quote?.lines ?? [];
  const canSubmit = !!quote && !quoting && !quoteError && !discountError && !pending;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
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
                maxLength={80}
                className={inputCls(!!fieldErr("name"))}
              />
            </Field>
            <Field label={t.phone} error={fieldErr("phone")}>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
                placeholder={t.phonePlaceholder}
                inputMode="tel"
                autoComplete="tel"
                maxLength={10}
                dir="ltr"
                className={inputCls(!!fieldErr("phone"))}
              />
            </Field>
            <Field label={t.phone2} error={fieldErr("phone2")}>
              <input
                value={phone2}
                onChange={(e) => setPhone2(e.target.value.replace(/[^\d]/g, ""))}
                placeholder={t.phonePlaceholder}
                inputMode="tel"
                maxLength={10}
                dir="ltr"
                className={inputCls(!!fieldErr("phone2"))}
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
                onChange={(e) => setWilaya(e.target.value ? Number(e.target.value) : "")}
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

            <fieldset>
              <legend className="mb-1.5 block text-sm font-medium text-ink">{t.deliveryType}</legend>
              <div className="grid grid-cols-2 gap-3">
                {(["home", "stopdesk"] as const).map((dt) => {
                  const enabled = !feeRow || (dt === "home" ? feeRow.home_enabled !== false : feeRow.stopdesk_enabled !== false);
                  const fee = feeRow ? (dt === "home" ? feeRow.home_fee : feeRow.stopdesk_fee) : null;
                  return (
                    <button
                      key={dt}
                      type="button"
                      disabled={!enabled}
                      aria-pressed={deliveryType === dt}
                      onClick={() => setDeliveryType(dt)}
                      className={cn(
                        "rounded-xl border p-3 text-start transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                        deliveryType === dt
                          ? "border-blush-dark bg-blush-light"
                          : "border-line bg-white hover:border-blush-dark",
                      )}
                    >
                      <span className="block text-sm font-medium text-ink">{dt === "home" ? t.home : t.stopdesk}</span>
                      {fee != null && enabled && (
                        <span className="mt-0.5 block text-xs text-muted">
                          {formatPrice(fee)} {currency}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <Field label={t.commune}>
              <input
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                placeholder={t.communePlaceholder}
                maxLength={80}
                className={inputCls(false)}
              />
            </Field>

            <Field label={t.address} error={fieldErr("address")}>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t.addressPlaceholder}
                rows={2}
                maxLength={300}
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
                maxLength={500}
                className={inputCls(false)}
              />
            </Field>

            <label className="flex items-start gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-0.5 size-4 accent-blush-dark"
              />
              {st.checkout.marketingConsent}
            </label>
          </div>
        </section>
      </div>

      {/* ---- Summary ---- */}
      <aside className="lg:sticky lg:top-20 lg:h-fit">
        <div className="rounded-2xl border border-line bg-cream p-5" aria-busy={quoting}>
          <h2 className="text-base font-semibold text-ink">{t.orderSummary}</h2>

          <ul className="mt-4 space-y-4">
            {items.map((item) => {
              const line = lines.find((l) => l.variantId === item.variantId) ?? null;
              const variantId = item.variantId;
              const qty = item.qty;
              const bad = quoteState?.variantId === variantId;
              return (
                <li key={variantId} className={cn("flex gap-3", bad && "rounded-lg bg-red-50 p-2")}>
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-blush-light">
                    {line?.imageUrl && (
                      <Image src={line.imageUrl} alt={line.name} fill sizes="64px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-ink">{line?.name ?? "…"}</p>
                    {line?.variantLabel && <p className="mt-0.5 text-xs text-muted">{line.variantLabel}</p>}
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center rounded-lg border border-line bg-white">
                        <button
                          type="button"
                          onClick={() => setQty(variantId, qty - 1)}
                          disabled={qty <= 1 || pending}
                          aria-label={`${t.quantity} −`}
                          className="grid size-7 place-items-center disabled:opacity-30"
                        >
                          <Minus className="size-3.5" aria-hidden />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold">{qty}</span>
                        <button
                          type="button"
                          onClick={() => setQty(variantId, qty + 1)}
                          disabled={pending || (line ? qty >= line.stock : false)}
                          aria-label={`${t.quantity} +`}
                          className="grid size-7 place-items-center disabled:opacity-30"
                        >
                          <Plus className="size-3.5" aria-hidden />
                        </button>
                      </div>
                      {line && (
                        <span className="text-sm font-semibold text-ink">
                          {formatPrice(line.lineTotal)} {currency}
                        </span>
                      )}
                      {mode === "cart" && (
                        <button
                          type="button"
                          onClick={() => cart.remove(variantId)}
                          aria-label={st.cart.remove}
                          className="grid size-7 place-items-center rounded text-muted hover:text-red-600"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Discount code */}
          <div className="mt-4 border-t border-line pt-4">
            {appliedCode && !discountError && quote?.discount ? (
              <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                <span className="flex items-center gap-1.5" dir="ltr">
                  <Tag className="size-4" aria-hidden />
                  {appliedCode}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedCode("");
                    setCodeInput("");
                  }}
                  aria-label={st.discount.remove}
                  className="grid size-6 place-items-center rounded hover:bg-green-100"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setAppliedCode(codeInput.trim().toUpperCase());
                }}
                className="flex gap-2"
              >
                <label className="sr-only" htmlFor="discount-code">
                  {st.discount.label}
                </label>
                <input
                  id="discount-code"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder={st.discount.placeholder}
                  maxLength={32}
                  dir="ltr"
                  className={cn(inputCls(!!discountError), "uppercase")}
                />
                <button
                  type="submit"
                  disabled={!codeInput.trim()}
                  className="shrink-0 rounded-lg border border-ink px-3 text-sm font-semibold text-ink disabled:opacity-40"
                >
                  {st.discount.apply}
                </button>
              </form>
            )}
            {discountError && (
              <p className="mt-1.5 flex items-center justify-between text-xs text-red-600" role="alert">
                {st.discount.errors[discountError] ?? st.discount.errors.invalid}
                <button type="button" className="underline" onClick={() => setAppliedCode("")}>
                  {st.discount.remove}
                </button>
              </p>
            )}
          </div>

          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">{t.subtotal}</dt>
              <dd className="font-medium text-ink">{quote ? `${formatPrice(quote.subtotal)} ${currency}` : "—"}</dd>
            </div>
            {quote && quote.discountAmount > 0 && (
              <div className="flex justify-between text-green-700">
                <dt>
                  {st.checkout.discount}
                  {quote.discount?.title ? ` · ${quote.discount.title}` : ""}
                </dt>
                <dd className="font-medium">
                  −{formatPrice(quote.discountAmount)} {currency}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">{t.deliveryFee}</dt>
              <dd className="font-medium text-ink">
                {quote?.deliveryFee == null ? (
                  <span className="text-xs text-muted">{st.checkout.selectWilayaForFee}</span>
                ) : quote.freeShipping ? (
                  <span className="text-green-700">
                    {quote.deliveryFeeOriginal ? (
                      <span className="me-1.5 text-muted line-through">{formatPrice(quote.deliveryFeeOriginal)}</span>
                    ) : null}
                    {st.checkout.freeShipping}
                  </span>
                ) : (
                  `${formatPrice(quote.deliveryFee)} ${currency}`
                )}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base">
              <dt className="font-semibold text-ink">{t.total}</dt>
              <dd className={cn("font-bold text-ink", quoting && "opacity-50")}>
                {quote ? `${formatPrice(quote.total)} ${currency}` : "—"}
              </dd>
            </div>
          </dl>

          {(serverError || quoteErrorText) && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
              {serverError ?? quoteErrorText}
              {quoteState?.error === "out_of_stock" && quoteState.available != null && (
                <> — {interpolate(st.cart.onlyAvailable, { count: quoteState.available })}</>
              )}
            </p>
          )}

          <button
            type="button"
            onClick={onPlaceOrder}
            disabled={!canSubmit}
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
      {confirmOpen && quote && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onKeyDown={(e) => e.key === "Escape" && setConfirmOpen(false)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <h3 id="confirm-title" className="text-lg font-bold text-ink">
              {t.confirmTitle}
            </h3>
            <p className="mt-2 text-sm text-muted">{t.confirmText}</p>
            <div className="mt-4 space-y-1 rounded-xl bg-cream p-3 text-start text-sm">
              <p className="font-medium text-ink">{name}</p>
              <p className="text-muted" dir="ltr">
                {phone}
              </p>
              <p className="text-muted">
                {feeRow ? wilayaName(feeRow) : ""} — {address}
              </p>
              <p className="pt-1 font-semibold text-ink">
                {t.total}: {formatPrice(quote.total)} {currency}
              </p>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-full border border-line py-3 text-sm font-semibold text-ink"
              >
                {t.confirmEdit}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={pending}
                className="flex-1 rounded-full bg-ink py-3 text-sm font-semibold text-white disabled:opacity-60"
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
      {error && (
        <span className="mt-1 block text-xs text-red-600" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

function inputCls(error: boolean) {
  return cn(
    "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-blush-dark focus-visible:ring-2 focus-visible:ring-blush",
    error ? "border-red-400" : "border-line",
  );
}
