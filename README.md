# NONA 🌸

Modern, mobile-first e-commerce store for women's fashion (lingerie, dresses, robes, shoes) in Algeria — **Cash on Delivery**, guest checkout, full admin dashboard. Optimized for high conversion, high delivery rate, and low cancellations/returns.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Supabase** — Postgres, Auth, Storage
- **Server Actions** for the backend
- **Vercel** hosting + Analytics

## Features

- 🛒 Guest checkout (no account required) — optional Google login for wishlist & order tracking
- 🌍 Trilingual: **العربية** (RTL, default) · **Français** · **English**
- 💳 Cash on Delivery, all 58 Algerian wilayas (home & stopdesk)
- 📦 Inventory logic tied to order status (confirm → decrement, cancel/return → restock)
- 🔐 Admin dashboard with roles (Admin / Manager)
- 🎨 Feminine, clean identity — white / blush pink / gold

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in Supabase keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |

## Environment

See [`.env.example`](.env.example). Secrets live in `.env.local` (git-ignored). Never commit real keys.

On Vercel, set these in **Project → Settings → Environment Variables**:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`.

## Database

```bash
# put SUPABASE_DB_URL (session-pooler connection string) in .env.local first
npm run db:migrate   # schema + RLS + triggers
npm run db:seed      # categories, 58 wilayas, settings, demo products
node --env-file=.env.local scripts/db/create-admin.mjs <email> <password>
```

## Admin

- Sign in at **`/ar/admin/login`** (email + password).
- Manage **orders** (status pipeline drives stock automatically), **products**
  (images upload to Supabase Storage, size/colour variants, stock),
  **delivery fees** per wilaya, store info, and cancellation/return reasons.

## Marketing & conversion tracking (Meta / TikTok)

In **Admin → Settings → Marketing**, paste:

- **Meta Pixel ID** + **Conversions API token** (from Meta Business Manager)
- **TikTok Pixel ID** (optional)

The storefront then fires `PageView`, `ViewContent`, `AddToWishlist`,
`Search`, `InitiateCheckout` and `Purchase` (browser pixel **and** server-side
Conversions API, deduplicated by event id, with hashed phone for matching).

**Product catalog feed** for Meta Commerce Manager dynamic ads:
`/api/meta-feed` (add `?lang=fr` for French). Feed `id` matches the pixel
`content_ids`.

## Deployment

Hosted on **Vercel**, connected to this GitHub repo — pushes to `main`
deploy automatically. SEO: `robots.txt`, `sitemap.xml`, OpenGraph, and
Product JSON-LD are generated automatically.
