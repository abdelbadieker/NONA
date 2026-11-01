# Shopify feature-parity matrix — NONA

_Updated 2026-10-29. Statuses are evidence-based. A page, table or button existing does **not** make a feature "verified"._

**Status legend**

| Code | Meaning |
| --- | --- |
| **VERIFIED** | Already implemented and verified (automated tests and/or run in a browser against a real database) |
| **UNVERIFIED** | Implemented but not yet verified end-to-end. The code compiles, lints and builds; DB logic is covered by PGlite tests where noted. It hasn't run against your Supabase project because migrations 0003–0005 aren't applied yet. |
| **PARTIAL** | Partially implemented |
| **MISSING** | Missing |
| **BLOCKED** | Blocked by an external provider or missing credentials |
| **N/A** | Not applicable |

**Status update 2026-11-01:** migrations `0003`–`0005` are applied to the live database, and the core order flow (pricing, creation, confirm/cancel stock, attribution, lifecycle rules, public RLS) is **VERIFIED on the live DB** inside a rolled-back transaction. UI items stay UNVERIFIED until the code is deployed to production and the smoke test (`testing-and-release.md` §5) is run.

### Live-site features rebuilt (their code wasn't recoverable)

| Capability | Status | Files |
| --- | --- | --- |
| Product reviews (submit → pending → moderate → public), homepage + product page, `aggregateRating` | UNVERIFIED (RLS VERIFIED in DB tests) | `actions/reviews.ts`, `components/reviews/*`, `admin/reviews` |
| Abandoned-checkout leads (name + phone, upsert per phone, deleted on order, 30-day retention) | UNVERIFIED (DB rule VERIFIED) | `actions/leads.ts`, `CheckoutForm.tsx`, `admin/leads` |
| Phone blocklist (orders rejected with a generic error) | UNVERIFIED (DB rule VERIFIED) | `create_order`, `admin/leads`, order page "Block this number" |
| Order spam / archive (hidden from lists, spam excluded from metrics) | UNVERIFIED | `actions/orders.ts`, orders list tabs |
| Ad attribution (`attribution`, `ad_source`) + orders-by-source | VERIFIED on live DB (storage) | `lib/attribution.ts` (unit-tested), `UtmCapture.tsx` |
| First-party page views → visits & conversion on dashboard | UNVERIFIED | `api/track`, `PageViewTracker.tsx` |
| Related products ("قد يعجبكِ أيضًا") | UNVERIFIED | `getRelatedProducts` |
| Fabricated homepage testimonials | Removed | replaced by real approved reviews |

**Test references:** "DB:" = `tests/db/commerce.test.ts` (real Postgres 17 via PGlite), "Unit:" = `tests/unit/*.test.ts`.

---

## Admin foundation

| Capability | Status | Files | Missing / notes | Tests |
| --- | --- | --- | --- | --- |
| Collapsible sidebar, grouped nav, mobile drawer | UNVERIFIED | `components/admin/AdminShell.tsx` | Breadcrumbs are "back" links only | Lint/build |
| Nav filtered by permission | UNVERIFIED | `AdminShell.tsx`, `lib/permissions.ts` | — | Unit: permissions |
| Dashboard with date ranges + real KPIs | UNVERIFIED | `admin/(panel)/page.tsx`, `lib/metrics.ts`, `data/admin-ops.ts#getDashboard` | Only fixed ranges (7/30/90); no comparison period; widgets not configurable | Unit: metrics formulas |
| Operational alerts (to confirm, flagged, low stock) | UNVERIFIED | dashboard | No push/email notifications | — |
| Global search / command palette | MISSING | — | Per-list search exists (orders, products, customers, inventory, audit) | — |
| Reusable list: search, filters, pagination | UNVERIFIED | `components/admin/ui.tsx` (`Pagination`, `buildHref`) | Column preferences not implemented; sorting fixed per list | — |
| Bulk actions | PARTIAL | `ProductTable.tsx` (publish/hide/archive/restore/feature/price %) | No bulk actions on orders/customers | — |
| CSV export | UNVERIFIED | `api/admin/export/[kind]` (orders, customers, products, inventory) | — | Unit: CSV formula-injection + round-trip |
| CSV import | MISSING | `lib/csv.ts#parseCsv` exists | Import UI, preview, mapping, background jobs | Unit: parser |
| Confirmation dialogs for destructive actions | PARTIAL | native `confirm()` in product/order/customer actions | Not a custom accessible dialog | — |
| Loading / empty / error / success states | PARTIAL | `EmptyState`, `ActionMessage`, skeletons in cart/checkout | No `loading.tsx` per admin route | — |
| Activity history | UNVERIFIED | `audit_logs`, `admin/audit` page, order timeline | — | — |
| Draft vs publish distinction | UNVERIFIED | product + page editors ("Save as draft" / "Save & publish") | — | — |
| Unsaved-change warning | PARTIAL | product editor (`beforeunload`) | Other editors don't warn | — |

## A — Product catalog

| Capability | Status | Files | Missing / notes | Tests |
| --- | --- | --- | --- | --- |
| Title, description (AR/FR/EN) | UNVERIFIED | `ProductForm.tsx`, `actions/products.ts` | Fixes data-loss bug D1 | Unit: schema |
| Rich-text description | PARTIAL | plain text with line breaks | No WYSIWYG (deliberate: avoids HTML injection) | — |
| Vendor, type, tags, cost, margin, weight, internal notes | UNVERIFIED | migration 0004, `ProductForm.tsx` | — | DB: migration applies |
| Status draft / active / archived | UNVERIFIED | `products.status` (generated), archive/restore actions | — | DB: archived hidden from anon |
| Media ordering, alt text | PARTIAL | image reorder in editor; alt text read from existing `alt_*` columns | No alt-text editor UI | — |
| Price, compare-at, per-variant price | UNVERIFIED | editor + validation (compare-at ≥ price) | — | Unit: schema |
| SKU, barcode per variant | UNVERIFIED | 0004 + editor | — | — |
| SEO title/description per language, canonical, hreflang | UNVERIFIED | product page `generateMetadata` | — | — |
| URL handle validation | UNVERIFIED | `SLUG_RE`, unique constraint | No automatic redirect when a handle changes | Unit: schema |
| Fashion details: material, care, fit, size guide, model info | UNVERIFIED | `products.details` jsonb, product page "Details" | Per-product structured size tables are free text | — |
| Variant options (size × colour) | PARTIAL | existing size/colour columns | Option names per product not configurable (always size/colour) | Unit: duplicate-variant rule |
| Colour → image switching | UNVERIFIED | `variant.image_url`, `ProductView.tsx` | — | — |
| Sold-out / unavailable variant states | VERIFIED | `lib/variants.ts`, `ProductPurchase.tsx` | Fixed live bug: unsized colours showed "sold out" (audit D11) | Unit: variants; browser-checked on `robe-m31t` |
| Create / edit / duplicate / archive / restore | UNVERIFIED | `actions/products.ts` | — | — |
| Safe delete (never-ordered only) | UNVERIFIED | `deleteProduct` | — | — |
| Bulk edit (status, feature, % price) | UNVERIFIED | `bulkUpdateProducts`, `bulkAdjustPrice` | — | — |
| Search/filter/sort in admin | UNVERIFIED | `getProductsPage` | — | — |
| CSV import/export | PARTIAL | export ✓ | import missing | — |
| Collections (manual + rule-based) | MISSING | categories exist (single category per product) | Collections tables, rules engine | — |
| Featured / best sellers / new arrivals | VERIFIED (existing) | flags + rails | `sold_count` now maintained | DB: sold_count |
| Related / complementary products | MISSING | — | — | — |
| Scheduled publishing | MISSING | — | Needs a scheduler (Vercel Cron) | — |
| Preview | PARTIAL | "View in store" for published products | No draft preview link | — |

## B — Media library

| Capability | Status | Files | Missing / notes |
| --- | --- | --- | --- |
| Direct-to-storage upload with type/size validation | UNVERIFIED | `lib/upload.ts`, bucket limits in 0003 | — |
| Central media library (browse, search, alt text, replace) | MISSING | — | Needs `media_assets` table + reference tracking |
| Safe deletion (reference check) | MISSING | — | — |
| Image optimisation | VERIFIED (existing) | `next/image` with Supabase remote pattern | Originals kept |

## C — Theme editor

| Capability | Status | Files | Missing / notes |
| --- | --- | --- | --- |
| Brand colours, hero image + texts per language, announcement bar | UNVERIFIED (existed; now validated) | `AppearanceForm.tsx`, `saveAppearance` | — |
| Fonts, spacing, header/footer layout, product-card settings | MISSING | — | — |
| Section-based page builder, templates, versions/rollback | MISSING | — | Largest remaining module; see roadmap Stage 4 |

## D — Landing pages / campaigns

| Capability | Status | Notes |
| --- | --- | --- |
| Campaign landing pages | PARTIAL | CMS pages (`/pages/[slug]`) give text pages with SEO and drafts. No product/collection blocks, CTA sections or lead forms per page. |
| UTM capture → order attribution | UNVERIFIED | `UtmCapture.tsx` → `orders.utm`; shown on the order page. |
| Campaign reporting | MISSING | — |

## E — Content & SEO

| Capability | Status | Files |
| --- | --- | --- |
| Pages (AR/FR/EN), draft/publish, footer placement | UNVERIFIED | 0005 `pages`, `admin/content`, `PageEditor.tsx` |
| Starter returns/privacy/terms/about | UNVERIFIED | Seeded as **unpublished drafts** for review |
| FAQ page (+ FAQPage JSON-LD), live shipping-fee page, contact page | UNVERIFIED | `(storefront)/faq`, `shipping`, `contact` |
| Sitemap with hreflang + CMS pages; robots | UNVERIFIED | `app/sitemap.ts` |
| Menus editor, redirects manager, blog | MISSING | — |

## F — Cart & checkout

| Capability | Status | Files | Tests |
| --- | --- | --- | --- |
| Add / remove / change quantity, persistent guest cart | UNVERIFIED | `lib/cart.ts`, `CartView.tsx`, header/bottom-nav badge | — |
| Buy-now one-tap flow kept (+ legacy links) | UNVERIFIED | `checkout/page.tsx` | — |
| Server-side pricing, stock, discount and fee recalculation | UNVERIFIED (logic VERIFIED in DB tests) | `private.price_order`, `quote_order`, `quoteCart` | DB: pricing suite (7 tests) |
| Discount code entry with localized errors | UNVERIFIED | `CheckoutForm.tsx` | DB: discount rules |
| Free-shipping threshold + progress bar | UNVERIFIED | settings `delivery.free_threshold` | DB: threshold |
| Guest checkout, Algerian phone validation (client + DB) | UNVERIFIED | `checkoutInputSchema`, `create_order` | Unit + DB |
| Duplicate-submission prevention (idempotency key) | UNVERIFIED (logic VERIFIED) | `create_order` | DB: idempotency |
| Atomic order creation | UNVERIFIED (logic VERIFIED) | `create_order` | DB |
| Explicit marketing consent checkbox | UNVERIFIED (logic VERIFIED) | checkout → `customers.accepts_marketing` | DB: consent |
| Order confirmation page + secure tracking link | UNVERIFIED | `checkout/success`, `orders.public_token` | — |
| Online payment | BLOCKED | Needs an approved Algerian provider (e.g. SATIM/CIB-Edahabia via a PSP) + credentials. `payment_method` constraint is ready to extend. | — |
| Confirmation notifications (email/SMS) | BLOCKED | No provider configured | — |

## G — Orders

| Capability | Status | Files | Tests |
| --- | --- | --- | --- |
| List: search (#, name, phone), status tabs, payment/wilaya/date filters, pagination | UNVERIFIED | `orders/page.tsx`, `getOrdersPage` | — |
| Enforced lifecycle (DB) with legal-next-status UI | UNVERIFIED (logic VERIFIED) | trigger + `OrderStatusControl.tsx` | DB: 36-pair map, illegal transitions |
| Payment status separate from order status | UNVERIFIED (logic VERIFIED) | 0004 | DB: COD payment |
| Timeline (status, calls, notes, shipment, payment, edits) with actor | UNVERIFIED (logic VERIFIED) | `order_events`, order page | DB: events + actor |
| Internal notes, tags, assignment, flags | UNVERIFIED | `OrderPanels.tsx` | — |
| Duplicate-order detection | UNVERIFIED (logic VERIFIED) | `create_order` flags `possible_duplicate` | DB |
| Cancellation with reason, returns with reason | UNVERIFIED | reasons tables | DB |
| Edit contact/address/notes (non-financial) | UNVERIFIED | `updateOrderDetails` | — |
| Edit items with re-pricing | MISSING | Cancel + recreate for now | — |
| Refund recording (permission `orders.refund`) | UNVERIFIED | `updateCod` | — |
| CSV export | UNVERIFIED | export route | Unit: CSV |
| Printable packing slip / invoice | MISSING | — | — |
| Never delete orders | VERIFIED | RLS has no delete policy; no delete action | DB: delete returns 0 rows |

## H — COD & confirmation

| Capability | Status | Notes |
| --- | --- | --- |
| Pending-confirmation queue | UNVERIFIED | "Not confirmed" tab + dashboard alert |
| Call-attempt logging with outcomes | UNVERIFIED | confirmed / no answer / busy / call back / wrong number / refused |
| Reconfirmation path | UNVERIFIED | `confirmed → not_confirmed` allowed |
| Failed-delivery attempts with reasons | UNVERIFIED | stays `in_delivery`; counter + timeline |
| COD amount due / collected (carrier-reported) / settled / refunded | UNVERIFIED (auto-collection on delivery VERIFIED) | DB: delivered ⇒ collected |
| Confirmation/delivery/return rate metrics | UNVERIFIED (formulas VERIFIED) | Unit: metrics |
| COD eligibility by wilaya / delivery type | UNVERIFIED (logic VERIFIED) | `delivery_fees.is_active/home_enabled/stopdesk_enabled` |
| WhatsApp/SMS confirmation | BLOCKED | No provider; manual phone workflow is recorded instead. Nothing is faked. |

## I — Inventory

| Capability | Status | Tests |
| --- | --- | --- |
| Variant stock list, low/out filters, per-variant thresholds | UNVERIFIED | — |
| Atomic adjustments with reasons + history | UNVERIFIED (logic VERIFIED) | DB: adjust/negative/log |
| Optimistic concurrency on edits | UNVERIFIED (logic VERIFIED) | DB: conflict |
| Overselling prevention (at confirmation) | VERIFIED (DB) | DB: insufficient stock blocks confirm |
| Release exactly once on cancel/return | VERIFIED (DB) | DB: double cancel |
| Locations, transfers, incoming stock, suppliers | MISSING | — |
| Inventory export | UNVERIFIED | — |
| Import / bulk quantity update | MISSING | — |

## J — Customers / CRM

| Capability | Status | Notes |
| --- | --- | --- |
| Customer records from checkout (by phone), backfilled from past orders | UNVERIFIED (logic VERIFIED) | DB tests |
| Stats: orders, delivered, canceled, returned, spend, first/last order | UNVERIFIED (logic VERIFIED) | DB tests |
| Profile with notes, tags, consent record, order history | UNVERIFIED | — |
| Segments: first-time, returning, marketing-consented, inactive 90 d, risky | UNVERIFIED | Fixed segments; no custom segment builder. "Purchased lingerie/shoes" segment is MISSING. |
| Export (`customers.export`, owner/admin only) | UNVERIFIED | Audit-logged |
| Consent revocation (staff can revoke, never grant) | UNVERIFIED | — |
| Privacy/data-access workflow (export/delete for one person) | MISSING | — |

## K — Shipping

| Capability | Status | Notes |
| --- | --- | --- |
| 58-wilaya fees, home/stop-desk toggles, wilaya on/off | UNVERIFIED | — |
| Free-shipping threshold | UNVERIFIED (logic VERIFIED) | — |
| Carrier + tracking number per order, customer tracking page | UNVERIFIED | — |
| Dispatch export | UNVERIFIED | Orders CSV filtered by status |
| Carrier API adapters (Yalidine, ZR Express, …) | BLOCKED | Needs API docs + credentials; manual workflow documented |
| Weight-based rates, commune-level zones | MISSING | — |

## L — Discounts

| Capability | Status | Tests |
| --- | --- | --- |
| Percentage, fixed, free shipping | UNVERIFIED (logic VERIFIED) | DB |
| Product / category scope, min subtotal, min quantity | UNVERIFIED (logic VERIFIED) | DB |
| Dates, usage limits (atomic), once per customer | UNVERIFIED (logic VERIFIED) | DB |
| Automatic discounts (best one applies) | UNVERIFIED (logic VERIFIED) | DB |
| No stacking; no negative totals | VERIFIED (DB) | DB + constraints |
| Buy X get Y, bundles, gift cards | MISSING | — |
| Promotion analytics | PARTIAL | usage count only |

## M — Forms

| Capability | Status | Notes |
| --- | --- | --- |
| Contact form (honeypot + rate limit, server validation) | UNVERIFIED | `/contact` |
| Newsletter with explicit consent + unsubscribe token | UNVERIFIED | footer; unsubscribe action exists, no public unsubscribe page yet |
| Admin inbox | UNVERIFIED | `/admin/forms` |
| Form builder (configurable fields) | MISSING | — |

## N — Pixels & events

| Capability | Status | Notes |
| --- | --- | --- |
| Meta Pixel + CAPI Purchase (dedup by deterministic event id) | UNVERIFIED | Event id is now `order-<uuid>`, so a retried checkout never sends a second Purchase |
| TikTok Pixel | UNVERIFIED | — |
| GA4 (page, view_item, add_to_cart, begin_checkout, purchase, search) | UNVERIFIED | — |
| AddToCart events (Meta/TikTok/GA4) | UNVERIFIED | — |
| IDs validated (no script injection) | VERIFIED | Unit tests |
| "Configured" vs "verified receiving events" shown honestly | UNVERIFIED | `/admin/integrations` |
| Consent banner gating pixels | MISSING | Recommended before scaling ads (Algerian Law 18-07) |

## O–Q — Marketing, communication, automation

| Capability | Status | Notes |
| --- | --- | --- |
| Campaign objects, QR codes, scheduling | MISSING | — |
| Transactional email / SMS | BLOCKED | No provider credentials. No messages are sent or simulated. |
| Workflow engine (Flow-like) | MISSING | DB triggers cover the critical "flows" deterministically (stock, timeline, customer stats, payment status). |

## R — Analytics

| Capability | Status | Notes |
| --- | --- | --- |
| Sales, AOV, COD rates, cash held by carrier, top products, new vs returning | UNVERIFIED (formulas VERIFIED) | Definitions in `data-model.md` |
| Sessions / conversion / traffic source | BLOCKED | Shown as unavailable until GA4 is connected; never estimated |
| Comparisons, report exports | MISSING | — |

## S — Storefront

| Capability | Status | Notes |
| --- | --- | --- |
| Home, shop, search, product, wishlist | VERIFIED (existing, build passes) | Unchanged except product page |
| Cart, checkout, tracking, FAQ, shipping, contact, CMS pages | PARTIAL verification | FAQ/shipping/contact/track pages and add-to-cart + badge VERIFIED in browser; cart pricing, checkout submit and tracking lookup need migrations |
| Broken footer links | VERIFIED | All 8 footer links return 200 (previously 4 were 404) |
| Faceted filters (size, colour, price) | MISSING | — |

## T — i18n / RTL

| Capability | Status | Notes |
| --- | --- | --- |
| Arabic default (RTL), French, English | VERIFIED (existing) | — |
| All new storefront + admin strings in 3 languages | UNVERIFIED | `i18n/store.ts`, `i18n/admin-ops.ts` |
| Logical CSS (start/end), RTL icon flips | PARTIAL | New code uses `start/end` + `rtl:` variants; not audited page by page |
| Reviewed translation workflow for product content | PARTIAL | Per-language fields; no "needs review" state |

## U — Integrations center

| Capability | Status |
| --- | --- |
| Status page (configured / manual / blocked, secrets never shown) | UNVERIFIED |
| Provider adapter interfaces (payments, carriers, email) | MISSING |
| App marketplace | N/A (not claimed) |

## V — Roles & security

| Capability | Status | Tests |
| --- | --- | --- |
| 8 system roles + custom roles, permission matrix UI | UNVERIFIED (RLS VERIFIED) | DB: RLS suite (7 tests) |
| Server-side authorization in every action | UNVERIFIED | Code review |
| Last-admin protection, full-access grants restricted | UNVERIFIED | — |
| Staff invitation / account creation | PARTIAL | Grants access to an existing account; account creation via Supabase or `create-admin.mjs` |

## W — Audit & health

| Capability | Status |
| --- | --- |
| Audit log (actor, action, resource, status, redacted metadata) | UNVERIFIED (redaction VERIFIED in unit tests) |
| Health page: migration presence, recent failures | UNVERIFIED |
| Background-job monitoring | N/A (no background jobs yet) |

## X — Import / export

| Capability | Status |
| --- | --- |
| Exports (orders, customers, products/variants, inventory), formula-injection safe, audit-logged | UNVERIFIED (CSV VERIFIED) |
| Imports with preview/mapping/error report | MISSING |

## Y — Entitlements

N/A — single-store business; no subscription tiers. The permission system is the capability mechanism.

## Z — AI assistance

BLOCKED/deferred by design. The AI Gateway key is stored server-side only. Nothing calls it yet. The integrations page shows "key present, features not enabled". Per your brief, core commerce reliability came first.
