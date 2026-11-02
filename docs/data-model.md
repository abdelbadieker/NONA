# NONA — Data model

Source of truth: `supabase/migrations/*.sql`. Migrations are additive and idempotent (except the original `0001`, which can only run once). Apply with `npm run db:migrate` (tracked in `private.schema_migrations`).

## Conventions

- **Money:** `numeric(12,2)` in DZD (exact decimal, no floats in the database). Totals are computed **in Postgres** (`private.price_order`); the browser only ever sends variant ids and quantities. DZD prices are whole numbers in practice. JS `Number` is used only for display.
- **Localized fields:** `<field>_ar` (required), `_fr`, `_en` columns for core text; `jsonb` keyed by locale for secondary content (`seo`, `details`).
- **Snapshots:** `order_items` store product name, variant label, size, colour, SKU, image and unit price at order time, so history never changes when the catalog does.
- **Soft states, not deletes:** products are archived; ordered variants deactivated; reasons deactivated; orders never deleted (no RLS delete policy).

## Entities

| Table | Purpose | Key columns / rules |
| --- | --- | --- |
| `categories` | Storefront categories | `slug` unique |
| `products` | Catalog item | `is_active` (storefront switch), `archived_at`, **`status`** generated (`active`/`draft`/`archived`), `vendor`, `product_type`, `tags[]`, `cost_price`, `weight_grams`, `seo`, `details` (material/care/fit/size_guide/model per locale), `sold_count` (delivered units, trigger), `total_stock` (trigger). Constraint: archived ⇒ not active. |
| `product_images` | Ordered images | `position`, `alt_*` |
| `product_variants` | Size × colour, stock | `stock ≥ 0`, unique (product, size, colour) nulls-not-distinct, `sku` unique, `barcode`, `price_override`, `cost_price`, `image_url`, `low_stock_threshold` |
| `inventory_logs` | Every stock movement | `change`, `reason` (`order_committed`, `order_released`, `received`, `correction`, `damaged`, `count`, `returned`, `initial`, `other`), `stock_after`, `created_by`, `note` |
| `customers` | CRM, one per phone | stats maintained by trigger: `orders_count`, `delivered_count`, `canceled_count`, `returned_count`, `total_spent` (Σ delivered totals), `first/last_order_at`; `accepts_marketing` + `marketing_consent_at/source`; `tags[]`, `notes` |
| `orders` | COD order | `status` (lifecycle), `payment_status`, `payment_method`='cod', `idempotency_key` (unique), `public_token` (tracking), discount fields, `delivery_fee` + `delivery_fee_original`, COD (`cod_collected_amount/_at`, `cod_settled_at`), shipment (`carrier`, `tracking_number`, `shipped_at`, `delivery_attempts`), confirmation (`call_attempts`, `last_call_outcome`), `flagged/flag_reason`, `assigned_to`, `tags[]`, `utm`, `source`, `customer_id` |
| `order_items` | Line snapshot | `sku`, `image_url` added |
| `order_events` | Timeline | `type` (`created`/`status`/`note`/`call`/`delivery_attempt`/`payment`/`shipment`/`edit`/`flag`/`assignment`/`system`), `data`, `actor_id` |
| `discounts` | Codes & automatic | `kind` (`percentage`/`fixed`/`free_shipping`), `value`, `min_subtotal`, `min_quantity`, `applies_to` + `product_ids/category_ids`, `starts_at/ends_at`, `usage_limit/usage_count`, `once_per_customer`, `automatic`, `is_active`. Code XOR automatic. |
| `delivery_fees` | 58 wilayas | `home_fee`, `stopdesk_fee`, `is_active`, `home_enabled`, `stopdesk_enabled` |
| `settings` | Key/value | public: `store`, `social`, `theme`, `home`, `home_sections` (published homepage layout), `marketing`, `delivery`; private: `marketing_secret`, `home_sections_draft` (`{sections, token, saved_at}`) |
| `staff_roles` | Roles → permissions | `permissions text[]` (`*` = all), `is_system` |
| `admins` | Staff accounts | `role_key` → `staff_roles` (legacy `role` enum kept for compatibility) |
| `audit_logs` | Who did what | actor, action, resource, status, redacted metadata |
| `rate_limits` | Fixed-window counters | service role only |
| `landing_pages` | Ad landing pages (`/{lang}/lp/{slug}`), migration 0006 | `slug` unique (lowercase-hyphen, ≤ 80), `product_id` → products (set null), `locale`, `status` draft/published, `blocks` jsonb (image/text/form, exactly one form), `form` jsonb (button and field settings), `seo`, `preview_token` (never readable by anon: column grants), `published_at`. Anon reads published rows only; writes need `content.manage`. |
| `pages` | CMS pages | per-locale title/body (plain text), `seo`, `is_published`, `show_in_footer`, `position` |
| `form_submissions` | Contact/wholesale | `status` new/read/archived, `ip_hash` (never raw IP) |
| `subscribers` | Newsletter consent | `status`, `consent_at/source`, `unsubscribe_token` |
| `users`, `wishlists`, `analytics`, reasons | unchanged | |

## Order lifecycle

```
not_confirmed ─► confirmed ─► in_delivery ─► delivered ─► returned
      │  ▲            │  ▲          │   ▲          │           │
      ▼  │            ▼  │          │   └─(pulled back)        │
   canceled ◄─────────┘  └─(re-confirm)                        │
      │                             └────► returned            │
      └─► not_confirmed (reopen)          (refused)  in_delivery ◄─ (corrections)
```

Allowed: `not_confirmed→confirmed|canceled`, `confirmed→in_delivery|canceled|not_confirmed`, `in_delivery→delivered|returned|confirmed`, `delivered→returned|in_delivery`, `returned→in_delivery`, `canceled→not_confirmed`. Enforced by trigger `orders_before_status`; mirrored in `src/lib/order-status.ts` (a test asserts both agree on all 36 pairs).

**Payment status (COD):** creation/confirmation never mark payment. `→ delivered` sets `collected` (amount defaults to order total, editable to the carrier-reported amount). Staff mark `settled` when the carrier pays out. `refunded` requires `orders.refund` and a returned order. Cancel / refused-at-door → `voided`.

## Stock reservation policy

- Placing an order **does not** reserve stock (high COD cancellation rates would otherwise lock inventory). The checkout soft-checks on-hand stock.
- Stock is **committed when staff confirm** (`confirmed`, `in_delivery`, `delivered` hold stock) and **released exactly once** when the order leaves those states (cancel, return).
- Overselling is impossible for confirmed orders: the variant `stock ≥ 0` constraint + row locks make concurrent confirmations serialize; the second fails with "insufficient stock" and changes nothing.
- Manual adjustments use `adjust_inventory` (atomic, logged, never negative, optional expected-value check).

## Pricing rules (`private.price_order`)

1. Lines: duplicate variants merged; each variant must be active with an active, non-archived product; `1 ≤ qty ≤ 99`; `qty ≤ stock`.
2. Unit price = `variant.price_override ?? product.price`.
3. Discount: an entered code wins; otherwise the single best automatic discount. Only one discount per order. Eligible base = lines in scope. Percentage = round(base × value / 100, 2); fixed = min(value, base); free shipping zeroes the fee.
4. Delivery fee by wilaya + type (respecting enabled flags); free if `subtotal − discount ≥ settings.delivery.free_threshold` (> 0).
5. Total = subtotal − discount + fee, never negative (also a table constraint).

## Metric definitions (dashboard)

| Metric | Formula | Source |
| --- | --- | --- |
| Orders | count of orders created in range | `orders.created_at` |
| Gross sales | Σ `subtotal` of non-canceled orders in range | `orders` |
| Discounts | Σ `discount_amount` of non-canceled orders | `orders` |
| Returns | Σ (`subtotal − discount_amount`) of returned orders | `orders` |
| Net sales | gross − discounts − returns | derived |
| Delivered revenue | Σ `total` (incl. delivery fee) of delivered orders | `orders` |
| AOV | (gross − discounts) ÷ non-canceled orders | derived |
| Confirmation rate | orders that reached confirmation ÷ orders no longer awaiting confirmation | `status` |
| Cancellation rate | canceled ÷ orders no longer awaiting confirmation | `status` |
| Delivery success | delivered ÷ (delivered + returned) | `status` |
| Return rate | returned ÷ (delivered + returned) | `status` |
| Held by carrier | Σ `cod_collected_amount` where `payment_status = collected` (all time) | `orders` |
| Out for delivery | Σ `total` where status `in_delivery` (all time) | `orders` |
| New customers | customers with `first_order_at` in range | `customers` |
| Returning customers | distinct customers ordering in range whose first order predates it | `customers` + `orders` |
| Top products | Σ quantity of delivered orders' lines in range | `order_items` |

Rates show "—" when the denominator is 0, never 0%. Sessions/conversion are unavailable until GA4 is connected and are never estimated.

## Backup & recovery

Before applying migrations to a database with real data: take a Supabase backup (Dashboard → Database → Backups; or `pg_dump`), run `npm run db:migrate:dry` (applies everything in one transaction, then rolls back), then `npm run db:migrate`. Each migration runs in its own transaction; a failure rolls that migration back and stops. New columns are additive with defaults; dropped policies are recreated in the same transaction.
