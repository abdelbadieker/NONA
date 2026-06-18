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
