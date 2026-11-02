"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { CheckoutText } from "@/i18n/checkout";
import type { StoreText } from "@/i18n/store";
import type { DeliveryFee, ProductVariant } from "@/lib/types";
import type { LandingForm } from "@/lib/landing";
import { placeOrder, quoteCart, type Quote } from "@/lib/actions/orders";
import { captureLead } from "@/lib/actions/leads";
import { resolveVariant, sizeAvailable } from "@/lib/variants";
import { PHONE_RE } from "@/lib/validation";
import { trackInitiateCheckout } from "@/lib/pixel";
import { cn, formatPrice } from "@/lib/utils";

export type LandingTexts = {
  size: string;
  color: string;
  quantity: string;
  soldOut: string;
  chooseSize: string;
  chooseColor: string;
  orderNow: string;
  previewOnly: string;
};

const sizeCls = { md: "py-3 text-base", lg: "py-4 text-lg", xl: "py-5 text-xl" } as const;
const shapeCls = { square: "rounded-none", rounded: "rounded-xl", pill: "rounded-full" } as const;

function newKey() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function readUtm(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem("nona_utm") || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export function LandingOrderForm({
  lang,
  slug,
  product,
  variants,
  form,
  deliveryFees,
  t,
  st,
  texts,
  currency,
  preview,
}: {
  lang: Locale;
  slug: string;
  product: { id: string; slug: string; name: string; price: number; compareAt: number | null };
  variants: ProductVariant[];
  form: LandingForm;
  deliveryFees: DeliveryFee[];
  t: CheckoutText;
  st: StoreText;
  texts: LandingTexts;
  currency: string;
  preview: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const active = useMemo(() => variants.filter((v) => v.is_active), [variants]);
  const sizes = useMemo(() => [...new Set(active.map((v) => v.size).filter((s): s is string => !!s))], [active]);
  const colors = useMemo(() => {
    const m = new Map<string, string | null>();
    active.forEach((v) => v.color && m.set(v.color, v.color_hex ?? null));
    return [...m.entries()].map(([color, hex]) => ({ color, hex }));
  }, [active]);

  const [size, setSize] = useState<string | null>(sizes.length === 1 ? sizes[0] : null);
  const [color, setColor] = useState<string | null>(colors.length === 1 ? colors[0].color : null);
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [wilaya, setWilaya] = useState<number | "">("");
  const [deliveryType, setDeliveryType] = useState<"home" | "stopdesk">("home");
  const [commune, setCommune] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(newKey);
  const [quote, setQuote] = useState<{ k: string; q: Quote | null; err: string | null } | null>(null);
  const tracked = useRef(false);
  const leadSent = useRef("");

  const { variant, needsSize, needsColor } = resolveVariant(active, size, color);
  const maxQty = Math.max(1, Math.min(variant?.stock ?? 1, 99));
  const q = Math.min(qty, maxQty);
  const unit = variant?.price_override ?? product.price;
  const feeRow = deliveryFees.find((f) => f.wilaya_code === wilaya);
  const qKey = JSON.stringify([variant?.id, q, wilaya, deliveryType]);

  useEffect(() => {
    if (!variant || variant.stock <= 0) return;
    let cancelled = false;
    const id = setTimeout(async () => {
      const r = await quoteCart({
        items: [{ variantId: variant.id, qty: q }],
        wilayaCode: wilaya === "" ? null : wilaya,
        deliveryType,
        locale: lang,
      });
      if (cancelled) return;
      setQuote(r.ok ? { k: qKey, q: r.quote, err: null } : { k: qKey, q: null, err: r.error });
      if (r.ok && !tracked.current) {
        tracked.current = true;
        trackInitiateCheckout({ ids: [product.id], value: r.quote.subtotal, currency: "DZD", numItems: q });
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [qKey, variant, q, wilaya, deliveryType, lang, product.id]);

  // Abandoned-checkout lead (same rules as the store checkout).
  useEffect(() => {
    const n = name.trim();
    const p = phone.trim();
    if (preview || n.length < 2 || !PHONE_RE.test(p)) return;
    const k = `${p}|${n}|${wilaya}`;
    if (leadSent.current === k) return;
    const id = setTimeout(() => {
      leadSent.current = k;
      captureLead({
        customerName: n,
        customerPhone: p,
        wilayaCode: wilaya === "" ? null : wilaya,
        commune: commune.trim(),
        productSlug: product.slug,
        productName: product.name,
        locale: lang,
        utm: { ...readUtm(), lp: slug },
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(id);
  }, [name, phone, wilaya, commune, preview, product.slug, product.name, lang, slug]);

  const cur = quote?.k === qKey ? quote : null;
  const errors = {
    name: name.trim().length < 2 ? t.errName : null,
    phone: !PHONE_RE.test(phone.trim()) ? t.errPhone : null,
    phone2: phone2.trim() && !PHONE_RE.test(phone2.trim()) ? t.errPhone : null,
    wilaya: wilaya === "" ? t.errWilaya : null,
    address: address.trim().length < 5 ? t.errAddress : null,
  };
  const err = (k: keyof typeof errors) => (submitted ? errors[k] : null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    if (needsSize || needsColor || !variant) return;
    if (Object.values(errors).some(Boolean)) {
      document.querySelector("#order [data-error='true']")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (preview) {
      setError(texts.previewOnly);
      return;
    }
    start(async () => {
      const r = await placeOrder({
        items: [{ variantId: variant.id, qty: q }],
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerPhone2: phone2.trim(),
        wilayaCode: Number(wilaya),
        commune: commune.trim(),
        address: address.trim(),
        deliveryType,
        notes: notes.trim(),
        locale: lang,
        idempotencyKey: key,
        utm: { ...readUtm(), lp: slug },
        source: "landing",
      });
      if (r.ok) {
        try {
          sessionStorage.setItem(
            "nona_purchase",
            JSON.stringify({ ids: r.productIds, value: r.value, currency: "DZD", numItems: r.numItems, eventId: r.eventId }),
          );
        } catch {}
        router.push(`/${lang}/checkout/success?order=${r.orderNumber}&t=${r.publicToken}`);
        return;
      }
      if (r.error !== "generic") setKey(newKey());
      const msg: Record<string, string> = {
        stock: t.errStock,
        unavailable: st.checkout.unavailableItem,
        wilaya: st.checkout.wilayaUnavailable,
        rate: st.checkout.rate,
      };
      setError(msg[r.error] ?? t.errGeneric);
    });
  }

  const accent = { borderColor: form.accentColor };
  const input = (bad: boolean) =>
    cn("w-full rounded-lg border bg-white px-3 py-3 text-base text-ink outline-none", bad ? "border-red-400" : "border-line");
  const soldOut = !!variant && variant.stock <= 0;
  const buttonLabel = needsSize ? texts.chooseSize : needsColor ? texts.chooseColor : soldOut ? texts.soldOut : form.buttonText || texts.orderNow;
  const total = cur?.q?.total ?? unit * q;

  return (
    <form id="order" onSubmit={submit} noValidate className="space-y-4 p-4 sm:p-6" style={{ backgroundColor: form.formBackground }}>
      {form.heading && <h2 className="text-center text-xl font-bold text-ink">{form.heading}</h2>}

      {form.showPrice && (
        <div className="flex items-baseline justify-center gap-3">
          <span className="text-2xl font-extrabold text-ink">
            {formatPrice(unit)} {currency}
          </span>
          {product.compareAt != null && product.compareAt > unit && (
            <span className="text-base text-muted line-through">{formatPrice(product.compareAt)}</span>
          )}
        </div>
      )}

      {colors.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">
            {texts.color}
            {color ? `: ${color}` : ""}
          </legend>
          <div className="flex flex-wrap gap-2">
            {colors.map(({ color: c, hex }) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-pressed={color === c}
                className={cn("flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm", color === c ? "font-semibold" : "border-line")}
                style={color === c ? accent : undefined}
              >
                <span className="size-5 rounded-full border border-black/10" style={{ backgroundColor: hex ?? "#ccc" }} />
                {c}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {sizes.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">{texts.size}</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                aria-pressed={size === s}
                className={cn(
                  "min-w-12 rounded-lg border-2 px-3 py-2 text-sm font-medium",
                  size === s ? "text-white" : "border-line bg-white text-ink",
                  !sizeAvailable(active, s, color) && "line-through opacity-40",
                )}
                style={size === s ? { backgroundColor: form.accentColor, borderColor: form.accentColor } : undefined}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {form.showQuantity && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">{texts.quantity}</span>
          <div className="flex items-center rounded-lg border border-line bg-white">
            <button type="button" onClick={() => setQty(Math.max(1, q - 1))} disabled={q <= 1} aria-label="−" className="grid size-10 place-items-center disabled:opacity-30">
              <Minus className="size-4" aria-hidden />
            </button>
            <span className="w-10 text-center font-semibold">{q}</span>
            <button type="button" onClick={() => setQty(Math.min(maxQty, q + 1))} disabled={q >= maxQty} aria-label="+" className="grid size-10 place-items-center disabled:opacity-30">
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        <label data-error={!!err("name")}>
          <span className="sr-only">{t.fullName}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.fullName} autoComplete="name" maxLength={80} className={input(!!err("name"))} />
          {err("name") && <span className="mt-1 block text-xs text-red-600">{err("name")}</span>}
        </label>
        <label data-error={!!err("phone")}>
          <span className="sr-only">{t.phone}</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder={t.phone} inputMode="tel" autoComplete="tel" maxLength={10} dir="ltr" className={cn(input(!!err("phone")), "text-start")} />
          {err("phone") && <span className="mt-1 block text-xs text-red-600">{err("phone")}</span>}
        </label>
        {form.showPhone2 && (
          <label data-error={!!err("phone2")}>
            <span className="sr-only">{t.phone2}</span>
            <input value={phone2} onChange={(e) => setPhone2(e.target.value.replace(/\D/g, ""))} placeholder={t.phone2} inputMode="tel" maxLength={10} dir="ltr" className={cn(input(!!err("phone2")), "text-start")} />
          </label>
        )}
        <label data-error={!!err("wilaya")}>
          <span className="sr-only">{t.wilaya}</span>
          <select value={wilaya} onChange={(e) => setWilaya(e.target.value ? Number(e.target.value) : "")} className={input(!!err("wilaya"))}>
            <option value="">{t.selectWilaya}</option>
            {deliveryFees.map((f) => (
              <option key={f.wilaya_code} value={f.wilaya_code}>
                {f.wilaya_code} - {lang === "ar" ? f.name_ar : (f.name_fr ?? f.name_ar)}
              </option>
            ))}
          </select>
          {err("wilaya") && <span className="mt-1 block text-xs text-red-600">{err("wilaya")}</span>}
        </label>
        <div className="grid grid-cols-2 gap-2">
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
                className={cn("rounded-lg border-2 p-2.5 text-start text-sm disabled:opacity-40", deliveryType === dt ? "font-semibold" : "border-line bg-white")}
                style={deliveryType === dt ? accent : undefined}
              >
                {dt === "home" ? t.home : t.stopdesk}
                {fee != null && enabled && <span className="block text-xs text-muted">{formatPrice(fee)} {currency}</span>}
              </button>
            );
          })}
        </div>
        {form.showCommune && (
          <input value={commune} onChange={(e) => setCommune(e.target.value)} placeholder={t.commune} maxLength={80} aria-label={t.commune} className={input(false)} />
        )}
        <label data-error={!!err("address")}>
          <span className="sr-only">{t.address}</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t.address} autoComplete="street-address" maxLength={300} className={input(!!err("address"))} />
          {err("address") && <span className="mt-1 block text-xs text-red-600">{err("address")}</span>}
        </label>
        {form.showNotes && (
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.notes} rows={2} maxLength={500} aria-label={t.notes} className={input(false)} />
        )}
      </div>

      <dl className="space-y-1 rounded-xl bg-cream p-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">{t.subtotal}</dt>
          <dd className="font-medium">{formatPrice(cur?.q?.subtotal ?? unit * q)} {currency}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">{t.deliveryFee}</dt>
          <dd className="font-medium">
            {cur?.q?.deliveryFee == null ? "—" : cur.q.freeShipping ? st.checkout.freeShipping : `${formatPrice(cur.q.deliveryFee)} ${currency}`}
          </dd>
        </div>
        <div className="flex justify-between border-t border-line pt-1 text-base">
          <dt className="font-bold">{t.total}</dt>
          <dd className="font-extrabold">{formatPrice(total)} {currency}</dd>
        </div>
      </dl>

      {(error || (cur?.err && cur.err !== "rate")) && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error ?? (cur?.err === "out_of_stock" ? t.errStock : cur?.err === "wilaya_unavailable" || cur?.err === "delivery_type_unavailable" ? st.checkout.wilayaUnavailable : t.errGeneric)}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || soldOut}
        className={cn(
          "w-full font-bold shadow-lg transition-transform active:scale-[0.98] disabled:opacity-60",
          sizeCls[form.buttonSize],
          shapeCls[form.buttonShape],
          form.animateButton && !pending && !soldOut && "animate-cta",
        )}
        style={{ backgroundColor: form.buttonColor, color: form.buttonTextColor }}
      >
        {pending ? t.submitting : buttonLabel}
      </button>
      <p className="text-center text-xs text-muted">{t.successNote}</p>
    </form>
  );
}
