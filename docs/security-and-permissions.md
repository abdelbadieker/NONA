# NONA — Security & permissions

## Layers

1. **Server Actions / route handlers** — every privileged entry point calls `authorize(<permission>)` (`src/lib/auth.ts`) *inside the action* (page checks don't protect actions), validates input with zod (`src/lib/validation.ts`), then writes. Exports re-check the permission per request.
2. **Database RLS** — staff reads are allowed for staff (`is_admin`), writes require `private.has_permission(auth.uid(), '<perm>')`. A staff JWT used directly against the REST API gets exactly its role's rights.
3. **RPCs** — `create_order`, `quote_order`, `admin_set_order_status`, `adjust_inventory`, `hit_rate_limit` are `SECURITY DEFINER`, `search_path = ''`, and **executable only by `service_role`** (revoked from `anon`/`authenticated`; tested).
4. **Service-role key** — only in `server-only` modules (`src/lib/supabase/admin.ts`), only after authorization. Never in client bundles (`NEXT_PUBLIC_` prefix not used).

## Roles (system, editable assignments; custom roles can be created)

| Permission | owner | admin | manager | product_manager | marketing_manager | fulfillment | support | analyst |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| dashboard.view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| orders.view | ✓ | ✓ | ✓ | | | ✓ | ✓ | ✓ |
| orders.manage | ✓ | ✓ | ✓ | | | ✓ | ✓ | |
| orders.export | ✓ | ✓ | ✓ | | | ✓ | | |
| orders.refund | ✓ | ✓ | | | | | | |
| products.view | ✓ | ✓ | ✓ | ✓ | ✓ | | | ✓ |
| products.manage | ✓ | ✓ | ✓ | ✓ | | | | |
| inventory.view / adjust | ✓ | ✓ | ✓ / ✓ | ✓ / ✓ | | ✓ / – | | ✓ / – |
| customers.view / manage | ✓ | ✓ | ✓ / ✓ | | ✓ / – | ✓ / – | ✓ / ✓ | ✓ / – |
| customers.export | ✓ | ✓ | | | | | | |
| discounts.manage | ✓ | ✓ | ✓ | | ✓ | | | |
| content.manage | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| marketing.manage | ✓ | ✓ | | | ✓ | | | |
| forms.view | ✓ | ✓ | ✓ | | ✓ | | ✓ | |
| reports.view | ✓ | ✓ | ✓ | | ✓ | | | ✓ |
| settings.manage | ✓ | ✓ | | | | | | |
| staff.manage | ✓ | ✓ | | | | | | |
| audit.view | ✓ | ✓ | | | | | | |

Existing accounts were mapped `admin → admin` (all permissions), `manager → manager`. **Behaviour change:** managers can no longer edit store settings, pixels or staff (least privilege). Only `owner`/`admin` can grant or revoke `owner`/`admin`; the last active full-access account can't be demoted or deactivated.

## Specific protections

| Risk | Control |
| --- | --- |
| Price/discount/fee tampering | All computed in `private.price_order`; client sends ids + quantities only. Tested. |
| Double orders | Idempotency key per checkout session; unique index; deterministic CAPI event id. Tested. |
| Overselling | Commit-at-confirmation with `stock ≥ 0` constraint and row locks. Tested. |
| Discount abuse | Atomic usage counter, once-per-customer, dates; quote endpoint rate-limited (60/min/client) against code brute force. Tested (DB). |
| Order spam | ≤ 5 orders / phone / hour (DB) + 10 checkouts / 10 min / client fingerprint. |
| Order-tracking enumeration | Needs order number **and** checkout phone (same error for both mismatches) or an unguessable token; 10 lookups / 10 min / client; minimal DTO (no address). |
| Stored XSS | Theme colours, pixel IDs, social URLs validated on save and read; JSON-LD `<` escaped; CMS bodies and form messages rendered as text, never HTML. Tested (unit). |
| CSV formula injection | Every exported cell starting with `= + - @ \t \r` is prefixed with `'`. Tested. |
| Secret exposure | CAPI token write-only in UI; non-public settings readable only by settings/marketing managers; audit metadata redacts keys matching token/secret/password/key. Tested (unit). |
| Spam on forms | Honeypot field, server validation, 5 submissions / hour / client. |
| Personal data in logs | IPs stored only as salted SHA-256 (`RATE_LIMIT_SALT`); no raw IPs. |
| Marketing consent | Only the customer can grant (checkout checkbox / newsletter checkbox, unchecked by default); staff can only revoke. A phone or email in an order is never treated as consent. |
| Uploads | Images only, ≤ 8 MB (bucket + client), staff with product/content rights only. |

## Open risks / actions for the owner

1. **Rotate credentials pasted into the chat during this work:** Supabase service-role key and database password, GitHub token (not used by this work — revoke it), Vercel AI Gateway key. They're stored only in `.env.local` (git-ignored) on this machine.
2. Deploy order matters: apply migrations **before** deploying this code (the new admin requires `staff_roles`). See `testing-and-release.md`.
3. Supabase Auth settings to review: disable public sign-ups if Google login isn't used for customers; enable leaked-password protection; require MFA for admin accounts if your plan allows.
4. No consent banner yet; if you run Meta/TikTok/GA ads at scale, add one (Algerian Law 18-07 on personal data).
5. `Database = any` typing remains; generating Supabase types (`supabase gen types`) would add compile-time safety to queries.
