# NONA — Architecture audit (baseline + changes)

_Audit date: 2026-10-29. Baseline = the downloaded `NONA-main` source, committed as git commit `35bab94` ("Baseline") in a local repository created for this work. A byte-for-byte copy is also kept in `../NONA-main-original-backup`._

## 1. Stack (unchanged)

| Area | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js **16.2.9** App Router, React 19.2, TypeScript (strict) | `src/proxy.ts` replaces `middleware.ts` (Next 16). Bundled docs in `node_modules/next/dist/docs` were followed. |
| Styling | Tailwind CSS v4 (`@theme` tokens in `src/app/globals.css`) | Brand tokens: blush / gold / ink / cream; Cairo (AR) + Inter (FR/EN). |
| Data | Supabase Postgres + Auth + Storage | Hand-written domain types (`src/lib/types.ts`); `Database = any`. |
| Mutations | Server Actions (`src/lib/actions/*`) | Service-role client used **after** per-action permission checks. |
| Hosting | Vercel (+ `@vercel/analytics`) | Deploys from GitHub `main` (per README). |
| i18n | `[lang]` segment, `ar` default (RTL), `fr`, `en` | Dictionaries in `src/i18n/*`. |
| Package manager | npm (lockfile v3) | |

No framework, database, or auth system was replaced.

## 2. Baseline checks (before any change)

| Check | Result |
| --- | --- |
| `tsc --noEmit` | ✅ pass |
| `eslint .` | ❌ **15 errors, 1 warning** — React Compiler rules: components created during render (`AdminShell`, order detail `Row`), `setState` in effects (`CheckoutForm`, `WishlistView`, `wishlist.ts`), mutating `document.cookie` in render scope (`LanguageSwitcher`), an unused disable directive (`SearchBar`). |
| `next build` | ✅ pass (48 static pages) |
| Tests | ❌ none — no test framework installed |
| Toolchain on this machine | Node/npm/git were not installed; installed Node 26.13 LTS + Git 2.56 via winget (with approval). |

## 3. What existed

**Storefront:** home (hero, rails, categories, reviews, FAQ), shop with category chips + sort, search, product page (gallery, size/colour picker, JSON-LD), wishlist (localStorage), **single-product "Order now" checkout** (no cart), success page, Meta/TikTok pixels + Meta CAPI purchase, Meta catalog CSV feed, sitemap/robots.

**Admin:** email/password login; dashboard (5 counters + recent orders); order list with status tabs; order detail with a free status dropdown; product list/create/edit (AR description only); appearance (4 colours + hero texts); settings (store, social, pixels, 58-wilaya fee table); cancellation/return reasons.

**Database (0001/0002):** categories, products, product_images, product_variants, orders, order_items, users, admins (`admin|manager`), wishlists, inventory_logs, delivery_fees, settings, reasons, analytics; RLS on every table; triggers: `total_stock` sync, stock commit/release on order status, `updated_at`; public `product-images` bucket.

## 4. Findings

### 4.1 Security (fixed)

| # | Finding | Severity | Fix |
| --- | --- | --- | --- |
| S1 | **Stored XSS via theme colours** — `settings.theme` values were interpolated into a raw `<style>` tag in the root layout. | High | Strict `#rrggbb` validation on save (`themeSchema`) **and** on read (`getTheme`). |
| S2 | **Stored XSS via pixel IDs** — Meta/TikTok IDs interpolated into inline `<script>`. | High | Provider-format validation on save and read; values emitted with `JSON.stringify`. |
| S3 | **XSS via JSON-LD** — product names inside `<script type="application/ld+json">` without escaping `<`. | Medium | `.replace(/</g, "\\u003c")` as recommended by the bundled Next.js docs. |
| S4 | **Any staff JWT could write any table** through the public REST API (`*_admin_all` policies used `is_admin` only); `manager` role was not enforced anywhere. | High | `0003`: configurable `staff_roles` + `private.has_permission()`; staff **read** policies vs permission-gated **write** policies; every Server Action calls `authorize(<permission>)`. |
| S5 | Meta Conversions API token sent back to the browser in the settings form. | Medium | Write-only field; the admin only sees "configured". Non-public settings rows readable only with `settings.manage`/`marketing.manage`. |
| S6 | Social links accepted any string (e.g. `javascript:`). | Low | https-only validation on save and render. |
| S7 | No rate limiting beyond "1 order per phone per 10 s". | Medium | DB-backed limiter (`hit_rate_limit`) for checkout, quotes (discount brute force), tracking lookups, forms; plus ≤5 orders/phone/hour in `create_order`. |
| S8 | Storage bucket had no type/size limits. | Low | Bucket: images only, 8 MB; uploads need `products.manage` or `content.manage`. |
| S9 | Sitemap and Meta feed used the service-role key for public data. | Low | Switched to the anon client (RLS-scoped). |

### 4.2 Data integrity (fixed)

| # | Finding | Fix |
| --- | --- | --- |
| D1 | **Saving a product wiped its French and English descriptions** (`description_fr/en: null` hard-coded). | Form now edits all three languages; action saves what it receives. |
| D2 | **Saving a product overwrote stock** with the value loaded in the form → lost updates if an order was confirmed meanwhile; no inventory log. | Stock changes go through `adjust_inventory` with an expected-value check (409-style `stock_conflict`); every change logged. |
| D3 | Removing a variant **deleted it even if ordered** (order history lost its link, later cancel couldn't restock). | Ordered variants are deactivated, never deleted. |
| D4 | Products were **hard-deleted**. | Archive/restore; permanent delete only for never-ordered products. |
| D5 | **Order creation not atomic** (order insert, then items insert, then manual delete on failure). | `public.create_order` RPC: one transaction, idempotency key, server pricing. |
| D6 | **Any status → any status** (e.g. `not_confirmed → delivered`). | DB trigger enforces the lifecycle; UI only offers legal transitions; tested for all 36 pairs. |
| D7 | `products.sold_count` never updated → "best selling" sort meaningless. | Maintained by trigger on delivered/undelivered. |
| D8 | Payment, order and fulfilment states conflated; a COD order had no notion of cash collected. | `payment_status` (pending / collected / settled / refunded / voided) + COD amounts, separate from `status`. |
| D9 | Deleting a cancellation/return reason nulled it on past orders (reports lose data). | Reasons are deactivated instead. |
| D11 | **Live sales blocker:** 7 of 15 live products mix variants with and without a size (e.g. `robe-m31t`: yellow = "Standard", green/black/brown = no size). The product page required an exact size match, so those colours showed **"sold out" despite 20 units each** and couldn't be ordered. Found during the browser smoke test. | `src/lib/variants.ts#resolveVariant` treats an empty option as "not applicable"; unit-tested against the real data shape; verified in the browser (all 4 colours orderable). |
| D10 | `0001_init.sql` is not re-runnable (unguarded `create policy`). | Left untouched (already applied in production); new migrations are idempotent and a tracked runner (`scripts/db/migrate.mjs`) treats 0001/0002 as a baseline. |

### 4.3 Product / UX gaps found

- Footer linked to `/faq`, `/shipping`, `/returns`, `/contact` — **all 404**. Fixed (pages built; CMS pages appear only once published).
- No cart, no order tracking, no discount codes, no customers view, no inventory screen, no audit trail, no exports. Built (see parity matrix).
- Admin dates hard-coded to `fr-DZ`; some aria-labels not localized. Partially addressed in rewritten screens.

## 5. Live database snapshot (read-only, 2026-10-29)

Inspected via the REST API with the service key (counts only, no row contents): 15 products, 49 images, 41 variants, 1 order (canceled), 2 auth users, 2 admins, 249 analytics rows, 58 wilayas, 1 bucket. **Migrations 0003–0005 have NOT been applied** to this database (see `testing-and-release.md` §4). The 249 analytics rows vs 1 order suggest the deployed code may differ from this source (this source only writes `order_placed`); verify before deploying.

### 5.1 Deployed code ≠ GitHub (found 2026-10-29, before applying migrations)

- GitHub `abdelbadieker/NONA` (public, only branch `main`, last push 2026-06-22 12:56 UTC) is **identical** to the downloaded source.
- The live site **nona-one.vercel.app** runs newer, unpushed code: it has `/ar/faq` and product reviews; its HTML references leads and page-view tracking; `/cart` and `/track` return 404 there.
- The live database has objects from that newer code: tables `blocked_phones`, `leads`, `reviews` (each with `is_admin`-based RLS); `orders.status_note`, `is_archived`, `is_spam`, `ad_source`, `attribution`, `custom_fields`; `admins.phone`. `page_view` analytics events start on 2026-06-22 at 23:54 UTC and continue today.
- No other repository and no local folder (Downloads, Desktop, Documents, OneDrive) contains that code.
- A schema diff showed **no conflicts** with 0003–0005: no shared column or table names. The full dry run passed on the live DB and was rolled back. A read-only snapshot of all data, policies, functions and triggers was saved outside the repo in `../db-snapshot-2026-10-29-pre-migration/` (contains customer data, keep private).
- **Consequence:** this codebase must be merged into the deployed source before deploying, or it would remove reviews, leads, blocked phones, spam/archive and attribution. Migrations were **not applied** pending that merge (owner's choice).

## 6. Architecture after this work

```
src/
  app/[lang]/(storefront)/  cart, checkout, track, faq, shipping, contact, pages/[slug] (+ existing)
  app/[lang]/admin/(panel)/ dashboard, orders, products, inventory, customers, discounts,
                            content, forms, staff, audit, integrations, settings, appearance, reasons
  app/api/admin/export/[kind]   permission-checked CSV exports
  lib/actions/   orders, products, inventory, discounts, customers, content, forms, staff, admin-config, tracking
  lib/data/      catalog, admin, admin-ops, tracking, content, marketing, appearance
  lib/           auth (getStaff/authorize), permissions, audit, rate-limit, csv, metrics,
                 order-status, validation, cart, local-store, pixel
supabase/migrations/ 0001 (orig) 0002 (orig) 0003 security 0004 commerce 0005 content/forms
tests/           unit/* (vitest)  db/* (PGlite: real migrations on Postgres 17)
```

Principles applied: authoritative pricing/stock/discount logic **in the database** (one source of truth, transactional); Server Actions are thin (authorize → validate → RPC/update → audit → revalidate); reads for admin go through the user's RLS session (defense in depth); client components receive minimal DTOs.
