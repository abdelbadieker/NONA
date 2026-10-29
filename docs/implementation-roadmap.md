# NONA — Implementation roadmap

Stages follow the brief. "Done" means the code is implemented, tested where noted and builds. For per-feature verification status, see `shopify-feature-parity-matrix.md`.

## Stage 0 — Audit & baseline ✅
Toolchain installed, local git baseline, baseline checks recorded, live DB inspected read-only, findings in `architecture-audit.md`.

## Stage 1 — Core integrity ✅ (code + DB tests), ⏳ deployment
- Least-privilege staff roles + RLS (0003); XSS fixes; rate limiting; audit log; storage limits.
- Atomic idempotent `create_order`; authoritative pricing; enforced order lifecycle; COD payment status; inventory adjustments with concurrency control (0004).
- Product save data-loss bugs fixed; archive instead of delete.
- **Pending:** apply migrations to Supabase (needs your go-ahead), then run the smoke test.

## Stage 2 — Admin foundation & catalog ✅ / partial
Done: permission-aware shell, dashboard KPIs, product editor (i18n, SEO, fashion details, variant SKU/barcode/cost/image), bulk actions, inventory screen, exports.
Remaining: collections (manual + rule-based), media library, CSV import with preview, global search, column preferences, custom dialogs, `loading.tsx` skeletons.

## Stage 3 — Commerce operations ✅ / partial
Done: order list and filters, COD confirmation workflow, shipment and failed deliveries, COD collection/settlement/refund, timeline, flags, assignment, customer tracking page, cart and checkout, discounts, delivery toggles, free-shipping threshold.
Remaining: order editing with re-pricing, packing slips and invoices, carrier API adapters (blocked on credentials), bulk order actions such as "mark shipped", dispatch manifest formatted per carrier.

## Stage 4 — Storefront & content ⏳
Done: CMS pages, FAQ, shipping, contact, newsletter, sitemap with hreflang, product SEO.
Next: menu and footer editor, redirects manager, section-based page builder for the homepage and landing pages (templates, draft/preview/publish, version history), faceted shop filters (size, colour, price), media library.

## Stage 5 — Customer growth ⏳
Done: CRM records and segments, consent capture and revocation, discounts, forms inbox, UTM attribution.
Next: custom segment builder (incl. "bought category X"), campaigns, consent banner, public unsubscribe page, email provider adapter, plus SMS/WhatsApp once a provider is chosen (blocked on credentials).

## Stage 6 — Analytics & automation ⏳
Done: dashboard metrics with documented formulas, computed from real data only.
Next: period comparisons, reports with CSV export, Vercel Cron jobs (scheduled publishing, low-stock alerts, stale-order reminders), a workflow engine with run history, idempotency and retries.

## Stage 7 — Integrations & AI ⏳
- Payment adapter interface. Online card payment needs a licensed Algerian provider: blocked on your choice and credentials.
- Carrier adapters (Yalidine, ZR Express, …): need API docs and keys.
- AI assistance via Vercel AI Gateway (key stored server-side): product description and SEO drafts that stay drafts until a human approves them. No customer personal data sent.

## Stage 8 — Hardening ⏳
Playwright end-to-end journeys (needs approval to download browsers), accessibility audit (axe), generated Supabase types, load test of checkout and confirmation concurrency on a staging DB, CSP headers.

## IN PROGRESS: rebuild the live-only features, then ship (owner said "do everything automatically")

The live site (nona-one.vercel.app) runs unpushed code that can't be recovered. Rebuild these features on the **existing live tables**, using exactly these definitions (read from the live DB on 2026-10-29):

- `blocked_phones(phone text PK, reason text, created_at timestamptz default now())`. Policy `blocked_admin_all` (is_admin). Use: reject or flag orders from blocked phones, plus an admin list.
- `leads(id uuid PK, customer_name, customer_phone text NOT NULL UNIQUE (leads_phone_key), wilaya_code int, commune, product_slug, product_name, locale default 'ar', ad_source text, attribution jsonb NOT NULL default '{}', created_at, updated_at)`, index on created_at desc. Use: upsert from a partially filled checkout (name + valid phone), delete on order, admin list with call/WhatsApp links, 30-day retention.
- `reviews(id uuid PK, product_id uuid FK products ON DELETE CASCADE, customer_name text NOT NULL, rating int CHECK 1..5, body text, status text default 'pending' CHECK pending/approved/rejected, created_at)`, indexes on product_id and status. Policies `reviews_select_public` (status = 'approved') and `reviews_admin_all`. Use: a "اتركي تقييمك" button on the product page and in the homepage "آراء عميلاتنا" section, moderation in the admin. One approved review exists.
- `orders`: `status_note text`, `is_archived bool NOT NULL default false`, `is_spam bool NOT NULL default false`, `ad_source text`, `attribution jsonb NOT NULL default '{}'`, `custom_fields jsonb NOT NULL default '{}'`. **Replace this repo's `orders.utm`/`orders.source` (0004, not yet applied) with `attribution`/`ad_source`.**
- `admins.phone text`.
- `analytics` page views: `event_type='page_view'`, `path`, `locale`, `session_id`, `metadata.referrer`. Add a beacon (rate-limited route), then show sessions and conversion on the dashboard.
- Product page: "قد يعجبكِ أيضًا" related-products rail.
- The live checkout is the same single-product COD form as the original.

Steps: add the definitions above to 0004/0005 with `create table/add column if not exists` (they're no-ops on live) → build the features + tests → cherry-pick onto `upgrade/commerce-platform` in `../NONA-github` (it already holds all earlier commits; `npm ci` was run there) → snapshot (`scripts/db/snapshot.mjs`) → `db:migrate` → push the branch (Vercel builds a **preview**; read its URL from the GitHub deployments API) → smoke-test the preview → merge to `main` (= production deploy via vercel[bot]).

## Suggested next 3 steps
1. Apply migrations 0003–0005 (backup → status → dry run → migrate), then run the smoke test.
2. Collections and faceted filters: highest storefront conversion value.
3. Packing slips plus carrier CSV formats for daily dispatch.
