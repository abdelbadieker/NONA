-- ============================================================
-- NONA — initial schema
-- Women's fashion store (Algeria, Cash on Delivery)
-- Postgres / Supabase. RLS enabled on every public table.
-- ============================================================

create extension if not exists pgcrypto;

-- Private schema for SECURITY DEFINER helpers (never exposed via the API).
create schema if not exists private;

-- ----------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------
do $$ begin
  create type public.order_status as enum
    ('not_confirmed','confirmed','in_delivery','delivered','returned','canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.delivery_type as enum ('home','stopdesk');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.admin_role as enum ('admin','manager');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------

-- Categories (lingerie, dresses, robes, shoes, …)
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name_ar     text not null,
  name_fr     text,
  name_en     text,
  image_url   text,
  position    int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Customer profiles (only for users who log in with Google; guests have none)
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Admin / manager accounts
create table if not exists public.admins (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        public.admin_role not null default 'manager',
  full_name   text,
  email       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Products
create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  category_id       uuid references public.categories(id) on delete set null,
  name_ar           text not null,
  name_fr           text,
  name_en           text,
  description_ar    text,
  description_fr    text,
  description_en    text,
  price             numeric(12,2) not null check (price >= 0),
  compare_at_price  numeric(12,2) check (compare_at_price >= 0),
  currency          text not null default 'DZD',
  is_active         boolean not null default true,   -- visible / hidden
  is_featured       boolean not null default false,
  is_best_seller    boolean not null default false,
  sold_count        int not null default 0,
  total_stock       int not null default 0,          -- maintained by trigger
  delivery_days_min int,
  delivery_days_max int,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Product images
create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  url         text not null,
  alt_ar      text,
  alt_fr      text,
  alt_en      text,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

-- Product variants (size / color combinations) — stock lives here
create table if not exists public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products(id) on delete cascade,
  size           text,
  color          text,
  color_hex      text,
  sku            text unique,
  price_override numeric(12,2) check (price_override >= 0),
  stock          int not null default 0 check (stock >= 0),
  position       int not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  unique nulls not distinct (product_id, size, color)
);

-- Orders (Cash on Delivery)
create table if not exists public.orders (
  id                     uuid primary key default gen_random_uuid(),
  order_number           bigint generated always as identity (start with 1001),
  user_id                uuid references auth.users(id) on delete set null,
  status                 public.order_status not null default 'not_confirmed',
  customer_name          text not null,
  customer_phone         text not null,
  customer_phone2        text,
  wilaya_code            int not null check (wilaya_code between 1 and 58),
  wilaya_name            text,
  commune                text,
  address                text not null,
  delivery_type          public.delivery_type not null default 'home',
  delivery_fee           numeric(12,2) not null default 0,
  subtotal               numeric(12,2) not null default 0,
  total                  numeric(12,2) not null default 0,
  notes                  text,
  locale                 text not null default 'ar',
  cancellation_reason_id uuid,
  return_reason_id       uuid,
  confirmed_at           timestamptz,
  delivered_at           timestamptz,
  canceled_at            timestamptz,
  returned_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create unique index if not exists orders_order_number_key on public.orders(order_number);

-- Order line items (snapshot of product/variant at order time)
create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    uuid references public.products(id) on delete set null,
  variant_id    uuid references public.product_variants(id) on delete set null,
  product_name  text not null,
  variant_label text,
  size          text,
  color         text,
  unit_price    numeric(12,2) not null,
  quantity      int not null check (quantity > 0),
  line_total    numeric(12,2) not null,
  created_at    timestamptz not null default now()
);

-- Wishlists (logged-in users only; guests use localStorage)
create table if not exists public.wishlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

-- Inventory audit log
create table if not exists public.inventory_logs (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid references public.product_variants(id) on delete set null,
  product_id  uuid references public.products(id) on delete set null,
  order_id    uuid references public.orders(id) on delete set null,
  change      int not null,
  reason      text not null,
  stock_after int,
  created_by  uuid,
  created_at  timestamptz not null default now()
);

-- Per-wilaya delivery fees (58 wilayas, home + stopdesk)
create table if not exists public.delivery_fees (
  id            uuid primary key default gen_random_uuid(),
  wilaya_code   int not null unique check (wilaya_code between 1 and 58),
  name_ar       text not null,
  name_fr       text,
  home_fee      numeric(12,2) not null default 0,
  stopdesk_fee  numeric(12,2) not null default 0,
  is_active     boolean not null default true
);

-- Key/value store settings (store info, policies, thresholds…)
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null,
  is_public   boolean not null default true,
  updated_at  timestamptz not null default now()
);

-- Cancellation reasons (admin-managed, used in reports)
create table if not exists public.cancellation_reasons (
  id        uuid primary key default gen_random_uuid(),
  label_ar  text not null,
  label_fr  text,
  label_en  text,
  position  int not null default 0,
  is_active boolean not null default true
);

-- Return reasons
create table if not exists public.return_reasons (
  id        uuid primary key default gen_random_uuid(),
  label_ar  text not null,
  label_fr  text,
  label_en  text,
  position  int not null default 0,
  is_active boolean not null default true
);

-- Business analytics events (funnel beyond what Vercel Analytics covers)
create table if not exists public.analytics (
  id          uuid primary key default gen_random_uuid(),
  event_type  text not null,
  locale      text,
  path        text,
  product_id  uuid,
  order_id    uuid,
  session_id  text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- Late FKs for order reasons
alter table public.orders
  drop constraint if exists orders_cancellation_reason_fk,
  add constraint orders_cancellation_reason_fk
    foreign key (cancellation_reason_id) references public.cancellation_reasons(id) on delete set null;
alter table public.orders
  drop constraint if exists orders_return_reason_fk,
  add constraint orders_return_reason_fk
    foreign key (return_reason_id) references public.return_reasons(id) on delete set null;

-- ----------------------------------------------------------------
-- Functions (SECURITY DEFINER helpers live in `private`)
-- ----------------------------------------------------------------

create or replace function private.is_admin(uid uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (select 1 from public.admins a where a.id = uid and a.is_active);
$$;

create or replace function private.admin_role(uid uuid)
returns public.admin_role language sql security definer set search_path = '' stable as $$
  select role from public.admins a where a.id = uid and a.is_active;
$$;

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end; $$;

-- Create a customer profile row when someone signs up (Google login)
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end; $$;

-- Keep products.total_stock in sync with active variants
create or replace function private.sync_product_total_stock()
returns trigger language plpgsql security definer set search_path = '' as $$
declare pid uuid;
begin
  pid := coalesce(new.product_id, old.product_id);
  update public.products p
    set total_stock = coalesce(
      (select sum(v.stock) from public.product_variants v
        where v.product_id = pid and v.is_active), 0)
  where p.id = pid;
  return coalesce(new, old);
end; $$;

-- Inventory state machine: stock is "held" while an order is
-- confirmed / in_delivery / delivered. Moving into a holding state
-- decrements stock; moving out restores it. Blocks overselling.
create or replace function private.handle_order_stock()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  holding_old boolean := false;
  holding_new boolean;
  item record;
  new_stock int;
begin
  if tg_op = 'UPDATE' then
    holding_old := old.status in ('confirmed','in_delivery','delivered');
  end if;
  holding_new := new.status in ('confirmed','in_delivery','delivered');

  if holding_old = holding_new then
    return new;
  end if;

  if (not holding_old) and holding_new then
    -- commit stock (decrement)
    for item in
      select variant_id, quantity from public.order_items
       where order_id = new.id and variant_id is not null
    loop
      update public.product_variants
         set stock = stock - item.quantity
       where id = item.variant_id
       returning stock into new_stock;
      if new_stock is null then continue; end if;
      if new_stock < 0 then
        raise exception 'Insufficient stock for variant % on order %', item.variant_id, new.id
          using errcode = 'check_violation';
      end if;
      insert into public.inventory_logs(variant_id, order_id, change, reason, stock_after)
      values (item.variant_id, new.id, -item.quantity, 'order_committed', new_stock);
    end loop;
  else
    -- release stock (increment back)
    for item in
      select variant_id, quantity from public.order_items
       where order_id = new.id and variant_id is not null
    loop
      update public.product_variants
         set stock = stock + item.quantity
       where id = item.variant_id
       returning stock into new_stock;
      insert into public.inventory_logs(variant_id, order_id, change, reason, stock_after)
      values (item.variant_id, new.id, item.quantity, 'order_released', new_stock);
    end loop;
  end if;

  return new;
end; $$;

-- ----------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------
drop trigger if exists set_updated_at on public.products;
create trigger set_updated_at before update on public.products
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on public.orders;
create trigger set_updated_at before update on public.orders
  for each row execute function private.set_updated_at();

drop trigger if exists set_updated_at on public.users;
create trigger set_updated_at before update on public.users
  for each row execute function private.set_updated_at();

drop trigger if exists sync_total_stock on public.product_variants;
create trigger sync_total_stock
  after insert or update of stock, is_active, product_id or delete on public.product_variants
  for each row execute function private.sync_product_total_stock();

drop trigger if exists order_stock on public.orders;
create trigger order_stock
  after insert or update of status on public.orders
  for each row execute function private.handle_order_stock();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ----------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------
alter table public.categories          enable row level security;
alter table public.users               enable row level security;
alter table public.admins              enable row level security;
alter table public.products            enable row level security;
alter table public.product_images      enable row level security;
alter table public.product_variants    enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.wishlists           enable row level security;
alter table public.inventory_logs      enable row level security;
alter table public.delivery_fees       enable row level security;
alter table public.settings            enable row level security;
alter table public.cancellation_reasons enable row level security;
alter table public.return_reasons      enable row level security;
alter table public.analytics           enable row level security;

-- Categories: public reads active, admins manage
create policy categories_select_public on public.categories
  for select to anon, authenticated using (is_active = true);
create policy categories_admin_all on public.categories
  for all to authenticated
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

-- Products
create policy products_select_public on public.products
  for select to anon, authenticated using (is_active = true);
create policy products_admin_all on public.products
  for all to authenticated
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

-- Product images (visible when parent product is active)
create policy product_images_select_public on public.product_images
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy product_images_admin_all on public.product_images
  for all to authenticated
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

-- Product variants (visible when active and parent product active)
create policy variants_select_public on public.product_variants
  for select to anon, authenticated
  using (is_active and exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy variants_admin_all on public.product_variants
  for all to authenticated
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

-- Customer profiles: owner can see/update; admins can read
create policy users_select_own on public.users
  for select to authenticated using (auth.uid() = id);
create policy users_update_own on public.users
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy users_admin_select on public.users
  for select to authenticated using (private.is_admin(auth.uid()));

-- Orders: owner reads own; admins manage; guests created via service role
create policy orders_select_own on public.orders
  for select to authenticated using (auth.uid() = user_id);
create policy orders_admin_all on public.orders
  for all to authenticated
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

-- Order items: follow the parent order
create policy order_items_select_own on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy order_items_admin_all on public.order_items
  for all to authenticated
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

-- Wishlists: owner only
create policy wishlists_all_own on public.wishlists
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Inventory logs: admins read (writes via trigger / service role)
create policy inventory_logs_admin_select on public.inventory_logs
  for select to authenticated using (private.is_admin(auth.uid()));

-- Delivery fees: public reads active, admins manage
create policy delivery_fees_select_public on public.delivery_fees
  for select to anon, authenticated using (is_active = true);
create policy delivery_fees_admin_all on public.delivery_fees
  for all to authenticated
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

-- Settings: public reads public ones, admins manage
create policy settings_select_public on public.settings
  for select to anon, authenticated using (is_public = true);
create policy settings_admin_all on public.settings
  for all to authenticated
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

-- Admins: any admin reads; only role='admin' writes
create policy admins_select on public.admins
  for select to authenticated using (private.is_admin(auth.uid()));
create policy admins_write on public.admins
  for all to authenticated
  using (private.admin_role(auth.uid()) = 'admin')
  with check (private.admin_role(auth.uid()) = 'admin');

-- Reason lookups: admins only
create policy cancel_reasons_admin_all on public.cancellation_reasons
  for all to authenticated
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));
create policy return_reasons_admin_all on public.return_reasons
  for all to authenticated
  using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));

-- Analytics: admins read (writes via service role)
create policy analytics_admin_select on public.analytics
  for select to authenticated using (private.is_admin(auth.uid()));

-- ----------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------
create index if not exists idx_products_category   on public.products(category_id);
create index if not exists idx_products_active      on public.products(is_active);
create index if not exists idx_products_featured    on public.products(is_featured) where is_featured;
create index if not exists idx_products_bestseller  on public.products(is_best_seller) where is_best_seller;
create index if not exists idx_products_created      on public.products(created_at desc);
create index if not exists idx_images_product       on public.product_images(product_id);
create index if not exists idx_variants_product     on public.product_variants(product_id);
create index if not exists idx_orders_status        on public.orders(status);
create index if not exists idx_orders_created       on public.orders(created_at desc);
create index if not exists idx_orders_user          on public.orders(user_id);
create index if not exists idx_orders_phone         on public.orders(customer_phone);
create index if not exists idx_order_items_order    on public.order_items(order_id);
create index if not exists idx_order_items_product  on public.order_items(product_id);
create index if not exists idx_order_items_variant  on public.order_items(variant_id);
create index if not exists idx_wishlists_user       on public.wishlists(user_id);
create index if not exists idx_inventory_variant    on public.inventory_logs(variant_id);
create index if not exists idx_inventory_order      on public.inventory_logs(order_id);
create index if not exists idx_analytics_type       on public.analytics(event_type);
create index if not exists idx_analytics_created    on public.analytics(created_at desc);
