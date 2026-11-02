-- ============================================================
-- NONA — 0006: product landing pages (ad campaigns)
--  * one page per campaign: ordered blocks (images / text / the order
--    form), form design settings, SEO, draft/published
--  * drafts are viewable only with their secret preview token
-- Additive and idempotent.
-- ============================================================

create table if not exists public.landing_pages (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title         text not null,
  product_id    uuid references public.products(id) on delete set null,
  locale        text not null default 'ar' check (locale in ('ar', 'fr', 'en')),
  status        text not null default 'draft' check (status in ('draft', 'published')),
  blocks        jsonb not null default '[]'::jsonb,
  form          jsonb not null default '{}'::jsonb,
  seo           jsonb not null default '{}'::jsonb,
  preview_token uuid not null default gen_random_uuid(),
  published_at  timestamptz,
  created_by    uuid,
  updated_by    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_landing_pages_product on public.landing_pages(product_id);
alter table public.landing_pages enable row level security;

-- Only published pages are public; drafts are served by trusted server code
-- after checking the preview token.
drop policy if exists landing_pages_select_public on public.landing_pages;
create policy landing_pages_select_public on public.landing_pages
  for select to anon, authenticated using (status = 'published');
drop policy if exists landing_pages_staff_read on public.landing_pages;
create policy landing_pages_staff_read on public.landing_pages
  for select to authenticated using (private.is_admin(auth.uid()));
drop policy if exists landing_pages_staff_write on public.landing_pages;
create policy landing_pages_staff_write on public.landing_pages
  for all to authenticated
  using (private.has_permission(auth.uid(), 'content.manage'))
  with check (private.has_permission(auth.uid(), 'content.manage'));

drop trigger if exists set_updated_at on public.landing_pages;
create trigger set_updated_at before update on public.landing_pages
  for each row execute function private.set_updated_at();

-- Anonymous visitors may read only the columns a public page needs (never
-- the preview token or editor ids). A column-level REVOKE is ineffective
-- while the table-level grant exists, so replace it with a column grant.
revoke select on public.landing_pages from anon;
grant select (id, slug, title, product_id, locale, status, blocks, form, seo, published_at, created_at, updated_at)
  on public.landing_pages to anon;
