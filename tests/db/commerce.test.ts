// Integration tests for the commerce core (migrations 0003–0005) running on a
// real Postgres 17 engine (PGlite) with a Supabase stub.
import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { asRole, createTestDb, createUser, migrationFiles, one } from "./harness";
import { canTransition, ORDER_STATUSES } from "@/lib/order-status";

type Json = Record<string, unknown>;

async function variantId(db: PGlite, slug: string, size: string, color: string) {
  const r = await one<{ id: string }>(
    db,
    `select v.id from product_variants v join products p on p.id = v.product_id
      where p.slug = $1 and v.size = $2 and v.color = $3`,
    [slug, size, color],
  );
  return r.id;
}

async function rpc(db: PGlite, fn: string, payload: Json): Promise<Json> {
  const r = await one<{ r: Json }>(db, `select public.${fn}($1::jsonb) as r`, [JSON.stringify(payload)]);
  return r.r;
}

async function stock(db: PGlite, id: string) {
  return (await one<{ stock: number }>(db, "select stock from product_variants where id = $1", [id])).stock;
}

const customer = (phone = "0661000001") => ({
  name: "Amina Test",
  phone,
  address: "12 rue des Fleurs, Bouira",
  commune: "Bouira",
});

let seq = 0;
const key = () => `test-key-${++seq}-${Date.now()}`;

describe("migrations", () => {
  it("apply cleanly on top of 0001/0002 + seed, and are re-runnable", async () => {
    const db = await createTestDb();
    // Re-applying the new migrations must be a no-op (idempotent DDL).
    // (0001_init.sql predates this rule: its CREATE POLICY statements are
    // not guarded, so it can only run once.)
    const newer = migrationFiles().filter((f) => !/000[12]_/.test(f));
    expect(newer.length).toBeGreaterThanOrEqual(3);
    for (const f of newer) await db.exec(readFileSync(f, "utf8"));
    const roles = await db.query<{ key: string }>("select key from staff_roles order by key");
    expect(roles.rows.map((r) => r.key)).toContain("analyst");
    const pages = await one<{ n: number }>(db, "select count(*)::int n from pages where not is_published");
    expect(pages.n).toBe(4);
  });
});

describe("pricing (quote_order)", () => {
  let db: PGlite;
  let blackM: string;
  let dressS: string;

  beforeAll(async () => {
    db = await createTestDb();
    blackM = await variantId(db, "lingerie-dentelle", "M", "أسود");
    dressS = await variantId(db, "robe-soiree", "S", "وردي");
  });

  it("computes lines, subtotal and wilaya fee from the database", async () => {
    const q = await rpc(db, "quote_order", {
      items: [{ variant_id: blackM, qty: 2 }, { variant_id: dressS, qty: 1 }],
      wilaya_code: 16,
      delivery_type: "home",
      locale: "fr",
    });
    expect(q.ok).toBe(true);
    expect(Number(q.subtotal)).toBe(2500 * 2 + 4800);
    expect(Number(q.delivery_fee)).toBe(500);
    expect(Number(q.total)).toBe(9800 + 500);
    const lines = q.lines as Json[];
    expect(lines[0].name).toBe("Ensemble lingerie dentelle");
    expect(lines).toHaveLength(2);
  });

  it("ignores any price the client sends", async () => {
    const q = await rpc(db, "quote_order", {
      items: [{ variant_id: blackM, qty: 1, unit_price: 1 }],
      subtotal: 1,
      total: 1,
      wilaya_code: 10,
      delivery_type: "stopdesk",
    });
    expect(Number(q.subtotal)).toBe(2500);
    expect(Number(q.delivery_fee)).toBe(150);
    expect(Number(q.total)).toBe(2650);
  });

  it("merges duplicate lines and rejects quantities above stock", async () => {
    const merged = await rpc(db, "quote_order", {
      items: [{ variant_id: blackM, qty: 1 }, { variant_id: blackM, qty: 2 }],
    });
    expect((merged.lines as Json[]).length).toBe(1);
    expect(Number(merged.subtotal)).toBe(7500);
    const tooMany = await rpc(db, "quote_order", { items: [{ variant_id: dressS, qty: 5 }] });
    expect(tooMany).toMatchObject({ ok: false, error: "out_of_stock", available: 4 });
  });

  it("rejects unknown/inactive variants, empty carts and disabled wilayas", async () => {
    expect(await rpc(db, "quote_order", { items: [] })).toMatchObject({ ok: false, error: "empty" });
    expect(
      await rpc(db, "quote_order", { items: [{ variant_id: "00000000-0000-0000-0000-000000000000", qty: 1 }] }),
    ).toMatchObject({ ok: false, error: "unavailable" });
    await db.query("update delivery_fees set is_active = false where wilaya_code = 33");
    expect(
      await rpc(db, "quote_order", { items: [{ variant_id: blackM, qty: 1 }], wilaya_code: 33 }),
    ).toMatchObject({ ok: false, error: "wilaya_unavailable" });
    await db.query("update delivery_fees set stopdesk_enabled = false where wilaya_code = 34");
    expect(
      await rpc(db, "quote_order", {
        items: [{ variant_id: blackM, qty: 1 }], wilaya_code: 34, delivery_type: "stopdesk",
      }),
    ).toMatchObject({ ok: false, error: "delivery_type_unavailable" });
  });

  it("applies percentage, fixed and free-shipping codes with their conditions", async () => {
    await db.query(`insert into discounts (code, title, kind, value, min_subtotal) values
      ('WELCOME10', 'Welcome', 'percentage', 10, 0),
      ('MINUS1000', 'Big', 'fixed', 1000, 6000),
      ('SHIPFREE', 'Ship', 'free_shipping', 0, 0),
      ('OLD', 'Old', 'percentage', 50, 0)`);
    await db.query("update discounts set ends_at = now() - interval '1 day', starts_at = now() - interval '2 days' where code = 'OLD'");

    const pct = await rpc(db, "quote_order", {
      items: [{ variant_id: blackM, qty: 1 }], wilaya_code: 16, discount_code: " welcome10 ",
    });
    expect(Number(pct.discount_amount)).toBe(250);
    expect(Number(pct.total)).toBe(2500 - 250 + 500);

    const belowMin = await rpc(db, "quote_order", {
      items: [{ variant_id: blackM, qty: 1 }], discount_code: "MINUS1000",
    });
    expect(belowMin.discount_error).toBe("min_subtotal");
    expect(Number(belowMin.discount_amount)).toBe(0);

    const fixed = await rpc(db, "quote_order", {
      items: [{ variant_id: blackM, qty: 3 }], discount_code: "MINUS1000",
    });
    expect(Number(fixed.discount_amount)).toBe(1000);

    const ship = await rpc(db, "quote_order", {
      items: [{ variant_id: blackM, qty: 1 }], wilaya_code: 1, discount_code: "SHIPFREE",
    });
    expect(Number(ship.delivery_fee)).toBe(0);
    expect(Number(ship.delivery_fee_original)).toBe(800);
    expect(ship.free_shipping_reason).toBe("discount");

    const expired = await rpc(db, "quote_order", { items: [{ variant_id: blackM, qty: 1 }], discount_code: "OLD" });
    expect(expired.discount_error).toBe("expired");
    const unknown = await rpc(db, "quote_order", { items: [{ variant_id: blackM, qty: 1 }], discount_code: "NOPE" });
    expect(unknown.discount_error).toBe("invalid");
  });

  it("scopes product discounts to eligible lines and applies the free-shipping threshold", async () => {
    const productId = (await one<{ id: string }>(db, "select id from products where slug = 'robe-soiree'")).id;
    await db.query(
      `insert into discounts (code, title, kind, value, applies_to, product_ids)
       values ('DRESS20', 'Dress', 'percentage', 20, 'products', array[$1::uuid])`,
      [productId],
    );
    const q = await rpc(db, "quote_order", {
      items: [{ variant_id: blackM, qty: 1 }, { variant_id: dressS, qty: 1 }], discount_code: "DRESS20",
    });
    expect(Number(q.discount_amount)).toBe(960); // 20% of 4800 only

    await db.query(`update settings set value = jsonb_set(value, '{free_threshold}', '7000') where key = 'delivery'`);
    const free = await rpc(db, "quote_order", {
      items: [{ variant_id: blackM, qty: 3 }], wilaya_code: 16,
    });
    expect(Number(free.delivery_fee)).toBe(0);
    expect(free.free_shipping_reason).toBe("threshold");
    await db.query(`update settings set value = jsonb_set(value, '{free_threshold}', '0') where key = 'delivery'`);
  });

  it("picks the best automatic discount when no code is entered", async () => {
    await db.query(`insert into discounts (code, title, kind, value, automatic) values
      (null, 'Auto 5', 'percentage', 5, true), (null, 'Auto 15', 'percentage', 15, true)`);
    const q = await rpc(db, "quote_order", { items: [{ variant_id: blackM, qty: 2 }] });
    expect((q.discount as Json).title).toBe("Auto 15");
    expect(Number(q.discount_amount)).toBe(750);
    await db.query("update discounts set is_active = false where automatic");
  });
});

describe("create_order", () => {
  let db: PGlite;
  let blackL: string;
  let redM: string;

  beforeAll(async () => {
    db = await createTestDb();
    blackL = await variantId(db, "lingerie-dentelle", "L", "أسود");
    redM = await variantId(db, "lingerie-dentelle", "M", "أحمر");
  });

  it("creates order, items, customer and timeline atomically; stock untouched until confirmation", async () => {
    const before = await stock(db, blackL);
    const r = await rpc(db, "create_order", {
      items: [{ variant_id: blackL, qty: 2 }, { variant_id: redM, qty: 1 }],
      wilaya_code: 10, delivery_type: "home", locale: "ar",
      customer: customer("0661000001"), idempotency_key: key(),
    });
    expect(r).toMatchObject({ ok: true, duplicate: false });
    expect(Number(r.total)).toBe(2500 * 3 + 250);

    const order = await one<Json>(db, "select * from orders where id = $1", [r.order_id]);
    expect(order.status).toBe("not_confirmed");
    expect(order.payment_status).toBe("pending");
    expect(order.payment_method).toBe("cod");
    const items = await db.query<Json>("select * from order_items where order_id = $1", [r.order_id]);
    expect(items.rows).toHaveLength(2);
    expect(items.rows.every((i) => i.product_name)).toBe(true);
    const cust = await one<Json>(db, "select * from customers where phone = '0661000001'");
    expect(cust.orders_count).toBe(1);
    expect(cust.accepts_marketing).toBe(false);
    const ev = await one<Json>(db, "select type from order_events where order_id = $1", [r.order_id]);
    expect(ev.type).toBe("created");
    expect(await stock(db, blackL)).toBe(before);
  });

  it("is idempotent: retrying with the same key returns the same order", async () => {
    const k = key();
    const payload = {
      items: [{ variant_id: redM, qty: 1 }], wilaya_code: 16,
      customer: customer("0661000002"), idempotency_key: k,
    };
    const a = await rpc(db, "create_order", payload);
    const b = await rpc(db, "create_order", payload);
    expect(b).toMatchObject({ ok: true, duplicate: true, order_id: a.order_id });
    const n = await one<{ n: number }>(db, "select count(*)::int n from orders where idempotency_key = $1", [k]);
    expect(n.n).toBe(1);
  });

  it("validates customer details on the server", async () => {
    const bad = await rpc(db, "create_order", {
      items: [{ variant_id: redM, qty: 1 }], wilaya_code: 16,
      customer: { ...customer(), phone: "12345" }, idempotency_key: key(),
    });
    expect(bad).toMatchObject({ ok: false, error: "invalid_customer" });
    const noWilaya = await rpc(db, "create_order", {
      items: [{ variant_id: redM, qty: 1 }], customer: customer(), idempotency_key: key(),
    });
    expect(noWilaya).toMatchObject({ ok: false, error: "invalid_customer" });
  });

  it("flags a second open order from the same phone as a possible duplicate", async () => {
    const r = await rpc(db, "create_order", {
      items: [{ variant_id: redM, qty: 1 }], wilaya_code: 16,
      customer: customer("0661000001"), idempotency_key: key(),
    });
    const o = await one<Json>(db, "select flagged, flag_reason from orders where id = $1", [r.order_id]);
    expect(o).toMatchObject({ flagged: true, flag_reason: "possible_duplicate" });
  });

  it("rejects an invalid discount instead of silently charging a different price", async () => {
    const r = await rpc(db, "create_order", {
      items: [{ variant_id: redM, qty: 1 }], wilaya_code: 16, discount_code: "NOPE",
      customer: customer("0661000003"), idempotency_key: key(),
    });
    expect(r).toMatchObject({ ok: false, error: "discount", reason: "invalid" });
  });

  it("enforces discount usage limits atomically", async () => {
    await db.query("insert into discounts (code, title, kind, value, usage_limit) values ('ONCE', 'Once', 'fixed', 100, 1)");
    const a = await rpc(db, "create_order", {
      items: [{ variant_id: redM, qty: 1 }], wilaya_code: 16, discount_code: "ONCE",
      customer: customer("0661000004"), idempotency_key: key(),
    });
    expect(a.ok).toBe(true);
    expect(Number(a.discount_amount)).toBe(100);
    const b = await rpc(db, "create_order", {
      items: [{ variant_id: redM, qty: 1 }], wilaya_code: 16, discount_code: "ONCE",
      customer: customer("0661000005"), idempotency_key: key(),
    });
    expect(b).toMatchObject({ ok: false, error: "discount", reason: "exhausted" });
    const used = await one<{ usage_count: number }>(db, "select usage_count from discounts where code = 'ONCE'");
    expect(used.usage_count).toBe(1);
  });

  it("records marketing consent only when explicitly given", async () => {
    await rpc(db, "create_order", {
      items: [{ variant_id: redM, qty: 1 }], wilaya_code: 16,
      customer: { ...customer("0661000006"), accepts_marketing: true }, idempotency_key: key(),
    });
    const c = await one<Json>(db, "select accepts_marketing, marketing_consent_source from customers where phone = '0661000006'");
    expect(c).toMatchObject({ accepts_marketing: true, marketing_consent_source: "checkout" });
  });

  it("stores attribution and ad source, and converts the phone's lead", async () => {
    await db.query("insert into leads (customer_phone, customer_name, product_slug) values ('0661000020', 'Lead', 'robe-soiree')");
    const r = await rpc(db, "create_order", {
      items: [{ variant_id: redM, qty: 1 }], wilaya_code: 16, source: "buy_now", ad_source: "facebook",
      utm: { utm_source: "facebook", utm_campaign: "eid" },
      customer: customer("0661000020"), idempotency_key: key(),
    });
    const o = await one<Json>(db, "select attribution, ad_source from orders where id = $1", [r.order_id]);
    expect(o.ad_source).toBe("facebook");
    expect(o.attribution).toMatchObject({ utm_campaign: "eid", checkout: "buy_now" });
    const leads = await one<{ n: number }>(db, "select count(*)::int n from leads where customer_phone = '0661000020'");
    expect(leads.n).toBe(0);
  });

  it("rejects blocked phones before writing anything", async () => {
    await db.query("insert into blocked_phones (phone, reason) values ('0661000030', 'refused 3x')");
    const before = await one<{ n: number }>(db, "select count(*)::int n from orders");
    const r = await rpc(db, "create_order", {
      items: [{ variant_id: redM, qty: 1 }], wilaya_code: 16,
      customer: customer("0661000030"), idempotency_key: key(),
    });
    expect(r).toMatchObject({ ok: false, error: "blocked" });
    const after = await one<{ n: number }>(db, "select count(*)::int n from orders");
    expect(after.n).toBe(before.n);
  });

  it("limits order spam per phone", async () => {
    for (let i = 0; i < 5; i++) {
      await rpc(db, "create_order", {
        items: [{ variant_id: redM, qty: 1 }], wilaya_code: 16,
        customer: customer("0661000099"), idempotency_key: key(),
      });
    }
    const sixth = await rpc(db, "create_order", {
      items: [{ variant_id: redM, qty: 1 }], wilaya_code: 16,
      customer: customer("0661000099"), idempotency_key: key(),
    });
    expect(sixth).toMatchObject({ ok: false, error: "rate" });
  });
});

describe("order lifecycle", () => {
  let db: PGlite;
  let variant: string;
  let staff: string;

  async function newOrder(qty: number, phone: string) {
    const r = await rpc(db, "create_order", {
      items: [{ variant_id: variant, qty }], wilaya_code: 16,
      customer: customer(phone), idempotency_key: key(),
    });
    expect(r.ok).toBe(true);
    return r.order_id as string;
  }

  async function setStatus(order: string, status: string, reason: string | null = null) {
    const r = await one<{ r: Json }>(
      db,
      "select public.admin_set_order_status($1, $2::order_status, $3, $4) as r",
      [order, status, reason, staff],
    );
    return r.r;
  }

  beforeAll(async () => {
    db = await createTestDb();
    variant = await variantId(db, "robe-soiree", "L", "وردي"); // stock 3
    staff = await createUser(db, "fulfil@test.dz", "fulfillment");
  });

  it("keeps the TypeScript transition map identical to the database rules", async () => {
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        const r = await one<{ ok: boolean }>(
          db,
          "select private.order_transition_allowed($1::order_status, $2::order_status) as ok",
          [from, to],
        );
        expect(r.ok, `${from} -> ${to}`).toBe(canTransition(from, to));
      }
    }
  });

  it("rejects illegal transitions in the database itself", async () => {
    const o = await newOrder(1, "0770000001");
    expect(await setStatus(o, "delivered")).toMatchObject({ ok: false, error: "invalid_transition" });
    await expect(db.query("update orders set status = 'delivered' where id = $1", [o])).rejects.toThrow(
      /NONA_INVALID_TRANSITION/,
    );
  });

  it("commits stock on confirm, releases it once on cancel, and logs everything", async () => {
    const o = await newOrder(2, "0770000002");
    expect(await stock(db, variant)).toBe(3);
    expect(await setStatus(o, "confirmed")).toMatchObject({ ok: true });
    expect(await stock(db, variant)).toBe(1);
    const reason = (await one<{ id: string }>(db, "select id from cancellation_reasons limit 1")).id;
    expect(await setStatus(o, "canceled", reason)).toMatchObject({ ok: true });
    expect(await stock(db, variant)).toBe(3);
    // Canceling again is a no-op, never a second restock.
    expect(await setStatus(o, "canceled", reason)).toMatchObject({ ok: true, unchanged: true });
    expect(await stock(db, variant)).toBe(3);

    const order = await one<Json>(db, "select payment_status, canceled_at, cancellation_reason_id from orders where id = $1", [o]);
    expect(order).toMatchObject({ payment_status: "voided", cancellation_reason_id: reason });
    const events = await db.query<Json>(
      "select type, actor_id, data from order_events where order_id = $1 and type = 'status' order by id", [o],
    );
    expect(events.rows).toHaveLength(2);
    expect(events.rows.every((e) => e.actor_id === staff)).toBe(true);
    const logs = await db.query<Json>("select change, reason from inventory_logs where order_id = $1 order by created_at", [o]);
    expect(logs.rows.map((l) => [l.change, l.reason])).toEqual([[-2, "order_committed"], [2, "order_released"]]);
  });

  it("blocks confirmation when stock is insufficient, leaving everything unchanged", async () => {
    const a = await newOrder(3, "0770000003");
    const b = await newOrder(1, "0770000004");
    expect(await setStatus(a, "confirmed")).toMatchObject({ ok: true });
    expect(await stock(db, variant)).toBe(0);
    expect(await setStatus(b, "confirmed")).toMatchObject({ ok: false, error: "stock" });
    const ob = await one<Json>(db, "select status from orders where id = $1", [b]);
    expect(ob.status).toBe("not_confirmed");
    expect(await stock(db, variant)).toBe(0);
    await setStatus(a, "canceled");
  });

  it("tracks COD payment separately from order status, plus sold count and customer stats", async () => {
    const o = await newOrder(1, "0770000005");
    await setStatus(o, "confirmed");
    let ord = await one<Json>(db, "select payment_status from orders where id = $1", [o]);
    expect(ord.payment_status).toBe("pending"); // confirming is not payment
    await setStatus(o, "in_delivery");
    await setStatus(o, "delivered");
    ord = await one<Json>(db, "select payment_status, cod_collected_amount, total, shipped_at, delivered_at from orders where id = $1", [o]);
    expect(ord.payment_status).toBe("collected");
    expect(Number(ord.cod_collected_amount)).toBe(Number(ord.total));
    expect(ord.shipped_at).not.toBeNull();
    const p = await one<{ sold_count: number }>(db, "select sold_count from products where slug = 'robe-soiree'");
    expect(p.sold_count).toBe(1);
    const c = await one<Json>(db, "select delivered_count, total_spent from customers where phone = '0770000005'");
    expect(c.delivered_count).toBe(1);
    expect(Number(c.total_spent)).toBe(Number(ord.total));

    // Post-delivery return restocks once and keeps the money as "collected"
    // (a refund is a separate, explicit action).
    const before = await stock(db, variant);
    await setStatus(o, "returned");
    expect(await stock(db, variant)).toBe(before + 1);
    ord = await one<Json>(db, "select payment_status from orders where id = $1", [o]);
    expect(ord.payment_status).toBe("collected");
    const p2 = await one<{ sold_count: number }>(db, "select sold_count from products where slug = 'robe-soiree'");
    expect(p2.sold_count).toBe(0);
  });
});

describe("inventory adjustments", () => {
  let db: PGlite;
  let variant: string;

  beforeAll(async () => {
    db = await createTestDb();
    variant = await variantId(db, "chaussures-talon", "40", "أسود"); // stock 2
  });

  const adjust = async (delta: number, reason: string, expected: number | null = null) =>
    (
      await one<{ r: Json }>(db, "select public.adjust_inventory($1, $2, $3, 'note', null, $4) as r", [
        variant, delta, reason, expected,
      ])
    ).r;

  it("adjusts atomically, logs, and refuses negative stock", async () => {
    expect(await adjust(5, "received")).toMatchObject({ ok: true, stock: 7 });
    expect(await adjust(-10, "damaged")).toMatchObject({ ok: false, error: "negative", stock: 7 });
    const log = await one<Json>(db, "select change, reason, stock_after, note from inventory_logs where variant_id = $1", [variant]);
    expect(log).toMatchObject({ change: 5, reason: "received", stock_after: 7, note: "note" });
    const total = await one<{ total_stock: number }>(db, "select total_stock from products where slug = 'chaussures-talon'");
    expect(total.total_stock).toBe(5 + 6 + 4 + 7);
  });

  it("detects stale screens with optimistic concurrency", async () => {
    expect(await adjust(1, "count", 3)).toMatchObject({ ok: false, error: "conflict", stock: 7 });
    expect(await adjust(1, "count", 7)).toMatchObject({ ok: true, stock: 8 });
    expect(await adjust(1, "free-text-hack")).toMatchObject({ ok: false, error: "invalid_reason" });
  });
});

describe("row level security", () => {
  let db: PGlite;
  let ids: Record<string, string>;
  let orderId: string;

  beforeAll(async () => {
    db = await createTestDb();
    ids = {
      admin: await createUser(db, "admin@test.dz", "admin"),
      manager: await createUser(db, "manager@test.dz", "manager"),
      analyst: await createUser(db, "analyst@test.dz", "analyst"),
      fulfillment: await createUser(db, "ship@test.dz", "fulfillment"),
      products: await createUser(db, "prod@test.dz", "product_manager"),
      customer: await createUser(db, "shopper@test.dz"),
    };
    const v = await variantId(db, "robe-satin", "M", "بيج");
    const r = await rpc(db, "create_order", {
      items: [{ variant_id: v, qty: 1 }], wilaya_code: 16,
      customer: customer("0550000001"), idempotency_key: key(),
    });
    orderId = r.order_id as string;
    await db.query(
      "insert into settings (key, value, is_public) values ('marketing_secret', '{\"meta_capi_token\":\"x\"}', false) on conflict (key) do nothing",
    );
  });

  it("anon: sees the active catalog, never orders, customers or RPCs", async () => {
    await asRole(db, "anon", null, async () => {
      const p = await db.query("select id from products");
      expect(p.rows.length).toBe(5);
      expect((await db.query("select id from orders")).rows).toHaveLength(0);
      expect((await db.query("select id from customers")).rows).toHaveLength(0);
      await expect(db.query("select public.create_order('{}'::jsonb)")).rejects.toThrow(/permission denied/);
      await expect(db.query("select public.quote_order('{}'::jsonb)")).rejects.toThrow(/permission denied/);
    });
  });

  it("archived products disappear from the storefront", async () => {
    await db.query("update products set is_active = false, archived_at = now() where slug = 'chemise-soie'");
    await asRole(db, "anon", null, async () => {
      expect((await db.query("select id from products")).rows).toHaveLength(4);
    });
    await expect(
      db.query("update products set is_active = true where slug = 'chemise-soie'"),
    ).rejects.toThrow(/products_archived_hidden/);
  });

  it("signed-in shoppers can browse (policies resolve private.* helpers)", async () => {
    await asRole(db, "authenticated", ids.customer, async () => {
      expect((await db.query("select id from products")).rows.length).toBeGreaterThan(0);
      expect((await db.query("select id from orders")).rows).toHaveLength(0);
    });
  });

  it("analyst: can read orders but cannot change them or read secrets", async () => {
    await asRole(db, "authenticated", ids.analyst, async () => {
      expect((await db.query("select id from orders")).rows).toHaveLength(1);
      const upd = await db.query("update orders set notes = 'x' where id = $1 returning id", [orderId]);
      expect(upd.rows).toHaveLength(0);
      const secret = await db.query("select key from settings where key = 'marketing_secret'");
      expect(secret.rows).toHaveLength(0);
      const prod = await db.query("update products set price = 1 returning id");
      expect(prod.rows).toHaveLength(0);
    });
  });

  it("fulfillment can update orders; product manager can edit products but not orders", async () => {
    await asRole(db, "authenticated", ids.fulfillment, async () => {
      const upd = await db.query("update orders set tracking_number = 'TRK1' where id = $1 returning id", [orderId]);
      expect(upd.rows).toHaveLength(1);
      expect((await db.query("delete from orders returning id")).rows).toHaveLength(0);
    });
    await asRole(db, "authenticated", ids.products, async () => {
      const p = await db.query("update products set vendor = 'NONA' where slug = 'robe-satin' returning id");
      expect(p.rows).toHaveLength(1);
      expect((await db.query("select id from orders")).rows).toHaveLength(0);
    });
  });

  it("only staff.manage can change staff; manager cannot edit settings", async () => {
    await asRole(db, "authenticated", ids.manager, async () => {
      const r = await db.query("update admins set role_key = 'admin' where id = $1 returning id", [ids.manager]);
      expect(r.rows).toHaveLength(0);
      const s = await db.query("update settings set value = '{}' where key = 'store' returning key");
      expect(s.rows).toHaveLength(0);
    });
    await asRole(db, "authenticated", ids.admin, async () => {
      const r = await db.query("update admins set role_key = 'support' where id = $1 returning id", [ids.analyst]);
      expect(r.rows).toHaveLength(1);
    });
  });

  it("reviews: anon sees only approved and can't write; leads are staff-only", async () => {
    const pid = (await one<{ id: string }>(db, "select id from products where slug = 'robe-satin'")).id;
    await db.query(
      `insert into reviews (product_id, customer_name, rating, body, status) values
       ($1, 'A', 5, 'top', 'approved'), ($1, 'B', 1, 'spam', 'pending'), ($1, 'C', 2, 'no', 'rejected')`,
      [pid],
    );
    await db.query("insert into leads (customer_phone, customer_name) values ('0550000099', 'Lead')");
    await asRole(db, "anon", null, async () => {
      expect((await db.query("select customer_name from reviews")).rows).toEqual([{ customer_name: "A" }]);
      await expect(
        db.query("insert into reviews (product_id, customer_name, rating) values ($1, 'X', 5)", [pid]),
      ).rejects.toThrow(/row-level security/);
      expect((await db.query("select id from leads")).rows).toHaveLength(0);
    });
    await asRole(db, "authenticated", ids.products, async () => {
      expect((await db.query("select id from leads")).rows).toHaveLength(0); // no orders.view
      const upd = await db.query("update reviews set status = 'approved' where customer_name = 'B' returning id");
      expect(upd.rows).toHaveLength(1);
    });
  });

  it("landing pages: anon sees published pages only, never preview tokens, and can't write", async () => {
    await db.query(`insert into landing_pages (slug, title, status, blocks) values
      ('lp-live', 'Live', 'published', '[{"id":"f","type":"form"}]'),
      ('lp-draft', 'Draft', 'draft', '[{"id":"f","type":"form"}]')`);
    await asRole(db, "anon", null, async () => {
      const r = await db.query<{ slug: string }>("select slug, title, blocks from landing_pages");
      expect(r.rows.map((x) => x.slug)).toEqual(["lp-live"]);
      await expect(db.query("select preview_token from landing_pages")).rejects.toThrow(/permission denied/);
      const upd = await db.query("update landing_pages set status = 'published' returning slug");
      expect(upd.rows).toHaveLength(0); // RLS: no policy lets anon write
    });
    await asRole(db, "authenticated", ids.products, async () => {
      // product_manager has content.manage
      const upd = await db.query("update landing_pages set title = 'Edited' where slug = 'lp-draft' returning id");
      expect(upd.rows).toHaveLength(1);
    });
    await asRole(db, "authenticated", ids.fulfillment, async () => {
      const upd = await db.query("update landing_pages set title = 'Nope' returning id");
      expect(upd.rows).toHaveLength(0);
    });
  });

  it("legacy inserts that only set `role` still get a role_key", async () => {
    const u = await createUser(db, "legacy@test.dz");
    await db.query("insert into admins (id, email, role) values ($1, 'legacy@test.dz', 'admin')", [u]);
    const a = await one<{ role_key: string }>(db, "select role_key from admins where id = $1", [u]);
    expect(a.role_key).toBe("admin");
  });
});
