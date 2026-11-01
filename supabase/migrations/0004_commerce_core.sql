-- ============================================================
-- NONA — 0004: commerce core
--  * richer catalog fields (vendor, type, tags, SEO, fashion details,
--    archive instead of delete, variant SKU/barcode/cost/image)
--  * customers (CRM) keyed by phone — guests stay guests
--  * discounts (codes + automatic), validated server-side only
--  * order lifecycle: enforced status transitions, payment status kept
--    separate from order status, COD collection, shipment, timeline
--  * atomic, idempotent create_order RPC; authoritative quote_order RPC
--  * atomic, logged inventory adjustments with optimistic concurrency
-- Additive and idempotent; existing rows are backfilled.
-- ============================================================

grant usage on schema private to service_role;

-- ----------------------------------------------------------------
-- Catalog
-- ----------------------------------------------------------------
alter table public.products
  add column if not exists vendor         text,
  add column if not exists product_type   text,
  add column if not exists tags           text[] not null default '{}',
  add column if not exists cost_price     numeric(12,2) check (cost_price >= 0),
  add column if not exists weight_grams   int check (weight_grams >= 0),
  add column if not exists seo            jsonb not null default '{}'::jsonb,
  add column if not exists details        jsonb not null default '{}'::jsonb,
  add column if not exists internal_notes text,
  add column if not exists archived_at    timestamptz;

-- Archived products can never be visible on the storefront.
alter table public.products drop constraint if exists products_archived_hidden;
alter table public.products add constraint products_archived_hidden
  check (archived_at is null or not is_active);

-- One derived status for filtering; `is_active` stays the storefront switch.
alter table public.products
  add column if not exists status text generated always as (
    case when archived_at is not null then 'archived'
         when is_active then 'active'
         else 'draft' end
  ) stored;

alter table public.product_variants
  add column if not exists barcode             text,
  add column if not exists cost_price          numeric(12,2) check (cost_price >= 0),
  add column if not exists weight_grams        int check (weight_grams >= 0),
  add column if not exists image_url           text,
  add column if not exists low_stock_threshold int check (low_stock_threshold >= 0);

create index if not exists idx_products_status on public.products(status);
create index if not exists idx_products_tags   on public.products using gin(tags);
create index if not exists idx_variants_stock  on public.product_variants(stock);

-- ----------------------------------------------------------------
-- Delivery options per wilaya
-- ----------------------------------------------------------------
alter table public.delivery_fees
  add column if not exists home_enabled     boolean not null default true,
  add column if not exists stopdesk_enabled boolean not null default true;

-- ----------------------------------------------------------------
-- Customers (CRM). One row per phone number; created at checkout.
-- ----------------------------------------------------------------
create table if not exists public.customers (
  id                       uuid primary key default gen_random_uuid(),
  phone                    text not null unique,
  full_name                text,
  email                    text,
  phone2                   text,
  wilaya_code              int,
  commune                  text,
  address                  text,
  user_id                  uuid references auth.users(id) on delete set null,
  tags                     text[] not null default '{}',
  notes                    text,
  accepts_marketing        boolean not null default false,
  marketing_consent_at     timestamptz,
  marketing_consent_source text,
  orders_count             int not null default 0,
  delivered_count          int not null default 0,
  canceled_count           int not null default 0,
  returned_count           int not null default 0,
  total_spent              numeric(12,2) not null default 0,
  first_order_at           timestamptz,
  last_order_at            timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
alter table public.customers enable row level security;

drop policy if exists customers_staff_read on public.customers;
create policy customers_staff_read on public.customers
  for select to authenticated using (private.has_permission(auth.uid(), 'customers.view'));
drop policy if exists customers_staff_write on public.customers;
create policy customers_staff_write on public.customers
  for update to authenticated
  using (private.has_permission(auth.uid(), 'customers.manage'))
  with check (private.has_permission(auth.uid(), 'customers.manage'));

drop trigger if exists set_updated_at on public.customers;
create trigger set_updated_at before update on public.customers
  for each row execute function private.set_updated_at();

create index if not exists idx_customers_last_order on public.customers(last_order_at desc);
create index if not exists idx_customers_tags       on public.customers using gin(tags);

-- ----------------------------------------------------------------
-- Discounts. One discount per order (no stacking); codes are stored
-- upper-case. Automatic discounts have no code.
-- ----------------------------------------------------------------
create table if not exists public.discounts (
  id                uuid primary key default gen_random_uuid(),
  code              text unique check (code is null or code ~ '^[A-Z0-9_-]{3,32}$'),
  title             text not null,
  kind              text not null check (kind in ('percentage', 'fixed', 'free_shipping')),
  value             numeric(12,2) not null default 0 check (value >= 0),
  min_subtotal      numeric(12,2) not null default 0 check (min_subtotal >= 0),
  min_quantity      int not null default 0 check (min_quantity >= 0),
  applies_to        text not null default 'all' check (applies_to in ('all', 'products', 'categories')),
  product_ids       uuid[] not null default '{}',
  category_ids      uuid[] not null default '{}',
  starts_at         timestamptz,
  ends_at           timestamptz,
  usage_limit       int check (usage_limit > 0),
  usage_count       int not null default 0,
  once_per_customer boolean not null default false,
  automatic         boolean not null default false,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint discounts_code_or_automatic check ((code is null) = automatic),
  constraint discounts_percentage_max check (kind <> 'percentage' or value <= 100),
  constraint discounts_dates check (ends_at is null or starts_at is null or ends_at > starts_at)
);
alter table public.discounts enable row level security;

drop policy if exists discounts_staff_read on public.discounts;
create policy discounts_staff_read on public.discounts
  for select to authenticated using (private.is_admin(auth.uid()));
drop policy if exists discounts_staff_write on public.discounts;
create policy discounts_staff_write on public.discounts
  for all to authenticated
  using (private.has_permission(auth.uid(), 'discounts.manage'))
  with check (private.has_permission(auth.uid(), 'discounts.manage'));

drop trigger if exists set_updated_at on public.discounts;
create trigger set_updated_at before update on public.discounts
  for each row execute function private.set_updated_at();

-- ----------------------------------------------------------------
-- Orders: payment, COD, shipment, CRM link, idempotency, attribution
-- ----------------------------------------------------------------
alter table public.orders
  add column if not exists customer_id           uuid references public.customers(id) on delete set null,
  add column if not exists idempotency_key       text,
  add column if not exists public_token          uuid not null default gen_random_uuid(),
  add column if not exists payment_method        text not null default 'cod',
  add column if not exists payment_status        text not null default 'pending',
  add column if not exists discount_id           uuid references public.discounts(id) on delete set null,
  add column if not exists discount_code         text,
  add column if not exists discount_amount       numeric(12,2) not null default 0,
  add column if not exists delivery_fee_original numeric(12,2),
  add column if not exists tags                  text[] not null default '{}',
  add column if not exists assigned_to           uuid references public.admins(id) on delete set null,
  add column if not exists call_attempts         int not null default 0,
  add column if not exists last_call_at          timestamptz,
  add column if not exists last_call_outcome     text,
  add column if not exists carrier               text,
  add column if not exists tracking_number       text,
  add column if not exists shipped_at            timestamptz,
  add column if not exists delivery_attempts     int not null default 0,
  add column if not exists cod_collected_amount  numeric(12,2),
  add column if not exists cod_collected_at      timestamptz,
  add column if not exists cod_settled_at        timestamptz,
  add column if not exists flagged               boolean not null default false,
  add column if not exists flag_reason           text,
  -- Columns that already exist on the live database (added outside this
  -- repo); declared here with identical definitions so fresh databases match.
  add column if not exists status_note           text,
  add column if not exists is_archived           boolean not null default false,
  add column if not exists is_spam               boolean not null default false,
  add column if not exists ad_source             text,
  add column if not exists attribution           jsonb not null default '{}'::jsonb,
  add column if not exists custom_fields         jsonb not null default '{}'::jsonb;

alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('cod'));
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('pending', 'collected', 'settled', 'refunded', 'voided'));
alter table public.orders drop constraint if exists orders_discount_amount_check;
alter table public.orders add constraint orders_discount_amount_check
  check (discount_amount >= 0 and discount_amount <= subtotal);
alter table public.orders drop constraint if exists orders_totals_check;
alter table public.orders add constraint orders_totals_check
  check (total >= 0 and subtotal >= 0 and delivery_fee >= 0);

create unique index if not exists orders_idempotency_key_key on public.orders(idempotency_key)
  where idempotency_key is not null;
create unique index if not exists orders_public_token_key on public.orders(public_token);
create index if not exists idx_orders_customer       on public.orders(customer_id);
create index if not exists idx_orders_payment_status on public.orders(payment_status);
create index if not exists idx_orders_flagged        on public.orders(flagged) where flagged;
create index if not exists idx_orders_wilaya         on public.orders(wilaya_code);
create index if not exists idx_orders_ad_source      on public.orders(ad_source);

-- ----------------------------------------------------------------
-- Phone blocklist and checkout leads (tables already exist on the live
-- database with these exact definitions; policies move to permissions).
-- ----------------------------------------------------------------
create table if not exists public.blocked_phones (
  phone      text primary key,
  reason     text,
  created_at timestamptz not null default now()
);
alter table public.blocked_phones enable row level security;
drop policy if exists blocked_admin_all on public.blocked_phones;
drop policy if exists blocked_phones_staff_read on public.blocked_phones;
create policy blocked_phones_staff_read on public.blocked_phones
  for select to authenticated using (private.has_permission(auth.uid(), 'orders.view'));
drop policy if exists blocked_phones_staff_write on public.blocked_phones;
create policy blocked_phones_staff_write on public.blocked_phones
  for all to authenticated
  using (private.has_permission(auth.uid(), 'orders.manage'))
  with check (private.has_permission(auth.uid(), 'orders.manage'));

-- A lead = a checkout started (name + valid phone) but not yet completed.
-- One row per phone; deleted when that phone places an order.
create table if not exists public.leads (
  id             uuid primary key default gen_random_uuid(),
  customer_name  text,
  customer_phone text not null,
  wilaya_code    int,
  commune        text,
  product_slug   text,
  product_name   text,
  locale         text default 'ar',
  ad_source      text,
  attribution    jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index if not exists leads_phone_key on public.leads(customer_phone);
create index if not exists idx_leads_created on public.leads(created_at desc);
alter table public.leads enable row level security;
drop policy if exists leads_admin_all on public.leads;
drop policy if exists leads_staff_read on public.leads;
create policy leads_staff_read on public.leads
  for select to authenticated using (private.has_permission(auth.uid(), 'orders.view'));
drop policy if exists leads_staff_write on public.leads;
create policy leads_staff_write on public.leads
  for delete to authenticated using (private.has_permission(auth.uid(), 'orders.manage'));

alter table public.order_items
  add column if not exists sku       text,
  add column if not exists image_url text;

-- Timeline: every status change, call, note, shipment and payment event.
create table if not exists public.order_events (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders(id) on delete cascade,
  type       text not null check (type in
    ('created', 'status', 'note', 'call', 'delivery_attempt', 'payment',
     'shipment', 'edit', 'flag', 'assignment', 'system')),
  message    text,
  data       jsonb not null default '{}'::jsonb,
  actor_id   uuid,
  created_at timestamptz not null default now()
);
alter table public.order_events enable row level security;

drop policy if exists order_events_staff_read on public.order_events;
create policy order_events_staff_read on public.order_events
  for select to authenticated using (private.has_permission(auth.uid(), 'orders.view'));

create index if not exists idx_order_events_order on public.order_events(order_id, created_at);

alter table public.inventory_logs add column if not exists note text;

-- ----------------------------------------------------------------
-- Order lifecycle
--   not_confirmed → confirmed | canceled
--   confirmed     → in_delivery | canceled | not_confirmed (re-confirm)
--   in_delivery   → delivered | returned | confirmed (pulled back)
--   delivered     → returned | in_delivery (correction)
--   returned      → in_delivery (correction)
--   canceled      → not_confirmed (reopen)
-- Stock is held while confirmed / in_delivery / delivered (0001 trigger).
-- ----------------------------------------------------------------
create or replace function private.order_transition_allowed(
  old_s public.order_status, new_s public.order_status)
returns boolean language sql immutable set search_path = '' as $$
  select old_s = new_s or (old_s::text || '>' || new_s::text) = any (array[
    'not_confirmed>confirmed', 'not_confirmed>canceled',
    'confirmed>in_delivery', 'confirmed>canceled', 'confirmed>not_confirmed',
    'in_delivery>delivered', 'in_delivery>returned', 'in_delivery>confirmed',
    'delivered>returned', 'delivered>in_delivery',
    'returned>in_delivery',
    'canceled>not_confirmed'
  ]);
$$;

create or replace function private.orders_before_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if not private.order_transition_allowed(old.status, new.status) then
    raise exception 'NONA_INVALID_TRANSITION % -> %', old.status, new.status
      using errcode = 'P0001';
  end if;

  -- Lifecycle timestamps
  if new.status = 'confirmed' and old.status = 'not_confirmed' then
    new.confirmed_at := now();
  elsif new.status = 'in_delivery' and old.status = 'confirmed' then
    new.shipped_at := coalesce(new.shipped_at, now());
  elsif new.status = 'delivered' then
    new.delivered_at := now();
  elsif new.status = 'canceled' then
    new.canceled_at := now();
  elsif new.status = 'returned' then
    new.returned_at := now();
  end if;
  if old.status = 'canceled' then
    new.canceled_at := null;
    new.cancellation_reason_id := null;
  elsif old.status = 'returned' then
    new.returned_at := null;
    new.return_reason_id := null;
  elsif old.status = 'delivered' and new.status = 'in_delivery' then
    new.delivered_at := null;
  end if;

  -- Payment status (COD): delivered = cash collected by the carrier.
  -- Creating or confirming an order is never treated as payment.
  if new.status = 'delivered' then
    if new.payment_status = 'pending' then
      new.payment_status := 'collected';
      new.cod_collected_amount := coalesce(new.cod_collected_amount, new.total);
      new.cod_collected_at := coalesce(new.cod_collected_at, now());
    end if;
  elsif old.status = 'delivered' and new.status = 'in_delivery' then
    if new.payment_status = 'collected' and new.cod_settled_at is null then
      new.payment_status := 'pending';
      new.cod_collected_amount := null;
      new.cod_collected_at := null;
    end if;
  elsif new.status = 'canceled' or (new.status = 'returned' and old.status = 'in_delivery') then
    if new.payment_status = 'pending' then
      new.payment_status := 'voided';
    end if;
  elsif new.payment_status = 'voided' and new.status in ('not_confirmed', 'in_delivery') then
    new.payment_status := 'pending';
  end if;

  return new;
end; $$;

drop trigger if exists orders_before_status on public.orders;
create trigger orders_before_status before update of status on public.orders
  for each row execute function private.orders_before_status();

-- Timeline entry for every status change. Actor = app.actor_id (set by the
-- RPCs below) or the signed-in user when updated directly through RLS.
create or replace function private.orders_log_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.order_events (order_id, type, data, actor_id)
    values (
      new.id, 'status',
      jsonb_build_object(
        'from', old.status, 'to', new.status,
        'reason_id', case new.status
          when 'canceled' then new.cancellation_reason_id
          when 'returned' then new.return_reason_id end
      ),
      coalesce(nullif(current_setting('app.actor_id', true), '')::uuid, auth.uid())
    );
  end if;
  return new;
end; $$;

drop trigger if exists orders_log_status on public.orders;
create trigger orders_log_status after update of status on public.orders
  for each row execute function private.orders_log_status();

-- products.sold_count = units in delivered orders.
create or replace function private.orders_sold_count()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_sign int := 0;
begin
  if new.status = 'delivered' and old.status <> 'delivered' then
    v_sign := 1;
  elsif old.status = 'delivered' and new.status <> 'delivered' then
    v_sign := -1;
  end if;
  if v_sign <> 0 then
    update public.products p
       set sold_count = greatest(0, p.sold_count + v_sign * s.qty)
      from (select product_id, sum(quantity)::int as qty
              from public.order_items
             where order_id = new.id and product_id is not null
             group by product_id) s
     where p.id = s.product_id;
  end if;
  return new;
end; $$;

drop trigger if exists orders_sold_count on public.orders;
create trigger orders_sold_count after update of status on public.orders
  for each row execute function private.orders_sold_count();

-- Customer statistics. total_spent = sum of DELIVERED order totals.
create or replace function private.refresh_customer_stats(p_customer uuid)
returns void language sql security definer set search_path = '' as $$
  update public.customers c set
    orders_count    = s.orders_count,
    delivered_count = s.delivered_count,
    canceled_count  = s.canceled_count,
    returned_count  = s.returned_count,
    total_spent     = s.total_spent,
    first_order_at  = s.first_at,
    last_order_at   = s.last_at
  from (
    select count(*)::int                                          as orders_count,
           count(*) filter (where status = 'delivered')::int      as delivered_count,
           count(*) filter (where status = 'canceled')::int       as canceled_count,
           count(*) filter (where status = 'returned')::int       as returned_count,
           coalesce(sum(total) filter (where status = 'delivered'), 0) as total_spent,
           min(created_at) as first_at,
           max(created_at) as last_at
      from public.orders
     where customer_id = p_customer
  ) s
  where c.id = p_customer;
$$;

create or replace function private.orders_customer_stats()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.customer_id is not null then
    perform private.refresh_customer_stats(new.customer_id);
  end if;
  if tg_op = 'UPDATE' and old.customer_id is not null
     and old.customer_id is distinct from new.customer_id then
    perform private.refresh_customer_stats(old.customer_id);
  end if;
  return new;
end; $$;

drop trigger if exists orders_customer_stats on public.orders;
create trigger orders_customer_stats
  after insert or update of status, customer_id on public.orders
  for each row execute function private.orders_customer_stats();

-- ----------------------------------------------------------------
-- Pricing (authoritative). Never trusts client prices or totals.
-- Input: { items:[{variant_id, qty}], wilaya_code?, delivery_type?,
--          discount_code?, phone?, locale? }
-- ----------------------------------------------------------------
create or replace function private.evaluate_discount(
  d public.discounts, p_lines jsonb, p_subtotal numeric, p_phone text)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_base numeric(12,2) := 0;
  v_qty  int := 0;
  v_amount numeric(12,2) := 0;
  l jsonb;
  v_eligible boolean;
begin
  if not d.is_active then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if d.starts_at is not null and d.starts_at > now() then
    return jsonb_build_object('ok', false, 'error', 'not_started');
  end if;
  if d.ends_at is not null and d.ends_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if d.usage_limit is not null and d.usage_count >= d.usage_limit then
    return jsonb_build_object('ok', false, 'error', 'exhausted');
  end if;
  if d.once_per_customer and p_phone is not null and exists (
       select 1 from public.orders o
        where o.customer_phone = p_phone and o.discount_id = d.id
          and o.status <> 'canceled') then
    return jsonb_build_object('ok', false, 'error', 'already_used');
  end if;

  for l in select * from jsonb_array_elements(p_lines) loop
    v_eligible := case d.applies_to
      when 'all' then true
      when 'products' then (l->>'product_id')::uuid = any(d.product_ids)
      when 'categories' then nullif(l->>'category_id', '')::uuid = any(d.category_ids)
      else false end;
    if coalesce(v_eligible, false) then
      v_base := v_base + (l->>'line_total')::numeric;
      v_qty := v_qty + (l->>'qty')::int;
    end if;
  end loop;

  if v_base <= 0 then
    return jsonb_build_object('ok', false, 'error', 'not_applicable');
  end if;
  if p_subtotal < d.min_subtotal then
    return jsonb_build_object('ok', false, 'error', 'min_subtotal', 'min_subtotal', d.min_subtotal);
  end if;
  if v_qty < d.min_quantity then
    return jsonb_build_object('ok', false, 'error', 'min_quantity', 'min_quantity', d.min_quantity);
  end if;

  v_amount := case d.kind
    when 'percentage' then round(v_base * d.value / 100, 2)
    when 'fixed' then least(d.value, v_base)
    else 0 end;

  return jsonb_build_object(
    'ok', true, 'id', d.id, 'code', d.code, 'title', d.title, 'kind', d.kind,
    'amount', v_amount, 'free_shipping', d.kind = 'free_shipping');
end; $$;

create or replace function private.price_order(p jsonb)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_locale  text := coalesce(nullif(p->>'locale', ''), 'ar');
  v_wilaya  int := nullif(p->>'wilaya_code', '')::int;
  v_type    text := coalesce(nullif(p->>'delivery_type', ''), 'home');
  v_code    text := upper(nullif(btrim(p->>'discount_code'), ''));
  v_phone   text := nullif(p->>'phone', '');
  v_lines   jsonb := '[]'::jsonb;
  v_subtotal numeric(12,2) := 0;
  v_count   int := 0;
  it        record;
  v_fee     public.delivery_fees;
  v_fee_original numeric(12,2);
  v_fee_amount   numeric(12,2);
  v_disc    public.discounts;
  v_eval    jsonb;
  v_best    jsonb;
  v_discount jsonb;
  v_discount_error text;
  v_discount_amount numeric(12,2) := 0;
  v_free_ship boolean := false;
  v_free_reason text;
  v_threshold numeric(12,2);
begin
  if jsonb_typeof(p->'items') is distinct from 'array' or jsonb_array_length(p->'items') = 0 then
    return jsonb_build_object('ok', false, 'error', 'empty');
  end if;
  if jsonb_array_length(p->'items') > 20 then
    return jsonb_build_object('ok', false, 'error', 'too_many_items');
  end if;
  if v_type not in ('home', 'stopdesk') then
    return jsonb_build_object('ok', false, 'error', 'invalid_delivery_type');
  end if;

  for it in
    select req.variant_id, req.qty,
           v.id as found_id, v.size, v.color, v.sku, v.stock, v.is_active as variant_active,
           coalesce(v.price_override, pr.price) as unit_price,
           pr.id as product_id, pr.slug, pr.category_id,
           pr.is_active as product_active, pr.archived_at,
           coalesce(nullif(case v_locale when 'fr' then pr.name_fr
                                         when 'en' then pr.name_en
                                         else pr.name_ar end, ''), pr.name_ar) as name,
           coalesce(v.image_url,
             (select pi.url from public.product_images pi
               where pi.product_id = pr.id order by pi.position limit 1)) as image_url
      from (select (e.value->>'variant_id')::uuid as variant_id,
                   sum((e.value->>'qty')::int)::int as qty,
                   min(e.ord) as ord
              from jsonb_array_elements(p->'items') with ordinality as e(value, ord)
             group by 1) req
      left join public.product_variants v on v.id = req.variant_id
      left join public.products pr on pr.id = v.product_id
     order by req.ord
  loop
    if it.found_id is null or not it.variant_active or not it.product_active
       or it.archived_at is not null then
      return jsonb_build_object('ok', false, 'error', 'unavailable', 'variant_id', it.variant_id);
    end if;
    if it.qty < 1 or it.qty > 99 then
      return jsonb_build_object('ok', false, 'error', 'invalid_qty', 'variant_id', it.variant_id);
    end if;
    if it.stock < it.qty then
      return jsonb_build_object('ok', false, 'error', 'out_of_stock',
        'variant_id', it.variant_id, 'available', greatest(it.stock, 0));
    end if;

    v_subtotal := v_subtotal + it.unit_price * it.qty;
    v_count := v_count + it.qty;
    v_lines := v_lines || jsonb_build_object(
      'variant_id', it.variant_id, 'product_id', it.product_id,
      'category_id', it.category_id, 'slug', it.slug, 'name', it.name,
      'variant_label', nullif(concat_ws(' / ', it.size, it.color), ''),
      'size', it.size, 'color', it.color, 'sku', it.sku, 'image_url', it.image_url,
      'unit_price', it.unit_price, 'qty', it.qty,
      'line_total', it.unit_price * it.qty, 'stock', it.stock);
  end loop;

  -- Discount: an entered code wins; otherwise the best automatic discount.
  if v_code is not null then
    select * into v_disc from public.discounts where code = v_code;
    if not found then
      v_discount_error := 'invalid';
    else
      v_eval := private.evaluate_discount(v_disc, v_lines, v_subtotal, v_phone);
      if (v_eval->>'ok')::boolean then
        v_discount := v_eval;
      else
        v_discount_error := v_eval->>'error';
      end if;
    end if;
  else
    for v_disc in select * from public.discounts where automatic and is_active loop
      v_eval := private.evaluate_discount(v_disc, v_lines, v_subtotal, v_phone);
      if (v_eval->>'ok')::boolean and (v_best is null
          or (v_eval->>'amount')::numeric > (v_best->>'amount')::numeric
          or ((v_eval->>'free_shipping')::boolean and (v_best->>'amount')::numeric = 0)) then
        v_best := v_eval;
      end if;
    end loop;
    v_discount := v_best;
  end if;

  if v_discount is not null then
    v_discount_amount := least((v_discount->>'amount')::numeric, v_subtotal);
    v_free_ship := (v_discount->>'free_shipping')::boolean;
    if v_free_ship then v_free_reason := 'discount'; end if;
  end if;

  -- Delivery fee
  if v_wilaya is not null then
    select * into v_fee from public.delivery_fees where wilaya_code = v_wilaya;
    if not found or not v_fee.is_active then
      return jsonb_build_object('ok', false, 'error', 'wilaya_unavailable');
    end if;
    if (v_type = 'home' and not v_fee.home_enabled)
       or (v_type = 'stopdesk' and not v_fee.stopdesk_enabled) then
      return jsonb_build_object('ok', false, 'error', 'delivery_type_unavailable');
    end if;
    v_fee_original := case v_type when 'home' then v_fee.home_fee else v_fee.stopdesk_fee end;

    select nullif(value->>'free_threshold', '')::numeric into v_threshold
      from public.settings where key = 'delivery';
    if not v_free_ship and coalesce(v_threshold, 0) > 0
       and v_subtotal - v_discount_amount >= v_threshold then
      v_free_ship := true;
      v_free_reason := 'threshold';
    end if;
    v_fee_amount := case when v_free_ship then 0 else v_fee_original end;
  end if;

  return jsonb_build_object(
    'ok', true,
    'currency', 'DZD',
    'lines', v_lines,
    'item_count', v_count,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'discount_error', v_discount_error,
    'discount_amount', v_discount_amount,
    'free_shipping', v_free_ship,
    'free_shipping_reason', v_free_reason,
    'delivery_fee_original', v_fee_original,
    'delivery_fee', v_fee_amount,
    'wilaya_name', v_fee.name_ar,
    'total', greatest(v_subtotal - v_discount_amount + coalesce(v_fee_amount, 0), 0)
  );
end; $$;

create or replace function public.quote_order(p jsonb)
returns jsonb language sql stable security definer set search_path = '' as $$
  select private.price_order(p);
$$;

-- ----------------------------------------------------------------
-- create_order: one transaction, idempotent on idempotency_key.
-- Validation happens before any write; after the first write every
-- failure raises, so nothing is left half-created.
-- ----------------------------------------------------------------
create or replace function public.create_order(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_key      text := nullif(p->>'idempotency_key', '');
  c          jsonb := coalesce(p->'customer', '{}'::jsonb);
  v_name     text := btrim(c->>'name');
  v_phone    text := btrim(c->>'phone');
  v_phone2   text := nullif(btrim(c->>'phone2'), '');
  v_address  text := btrim(c->>'address');
  v_commune  text := nullif(btrim(c->>'commune'), '');
  v_notes    text := nullif(btrim(c->>'notes'), '');
  v_marketing boolean := coalesce((c->>'accepts_marketing')::boolean, false);
  v_locale   text := coalesce(nullif(p->>'locale', ''), 'ar');
  v_quote    jsonb;
  v_existing record;
  v_recent   int;
  v_flag_reason text;
  v_customer uuid;
  v_order    record;
  v_disc_id  uuid;
  l          jsonb;
begin
  if v_key is not null then
    select id, order_number, public_token, total into v_existing
      from public.orders where idempotency_key = v_key;
    if found then
      return jsonb_build_object('ok', true, 'duplicate', true, 'order_id', v_existing.id,
        'order_number', v_existing.order_number, 'public_token', v_existing.public_token,
        'total', v_existing.total);
    end if;
  end if;

  if v_name is null or char_length(v_name) < 2 or char_length(v_name) > 80
     or v_phone is null or v_phone !~ '^0[5-7][0-9]{8}$'
     or (v_phone2 is not null and v_phone2 !~ '^0[5-7][0-9]{8}$')
     or v_address is null or char_length(v_address) < 5 or char_length(v_address) > 300
     or nullif(p->>'wilaya_code', '') is null
     or v_locale not in ('ar', 'fr', 'en') then
    return jsonb_build_object('ok', false, 'error', 'invalid_customer');
  end if;

  -- Blocked numbers (spam / repeated refusals) can't order.
  if exists (select 1 from public.blocked_phones where phone = v_phone) then
    return jsonb_build_object('ok', false, 'error', 'blocked');
  end if;

  -- Abuse guard: at most 5 orders per phone per hour.
  select count(*) into v_recent from public.orders
   where customer_phone = v_phone and created_at > now() - interval '1 hour';
  if v_recent >= 5 then
    return jsonb_build_object('ok', false, 'error', 'rate');
  end if;

  v_quote := private.price_order(p || jsonb_build_object('phone', v_phone));
  if not (v_quote->>'ok')::boolean then
    return v_quote;
  end if;
  if v_quote->>'discount_error' is not null then
    return jsonb_build_object('ok', false, 'error', 'discount',
      'reason', v_quote->>'discount_error');
  end if;

  -- Possible duplicate: same phone already has an open order today.
  if exists (select 1 from public.orders
              where customer_phone = v_phone
                and status in ('not_confirmed', 'confirmed')
                and created_at > now() - interval '24 hours') then
    v_flag_reason := 'possible_duplicate';
  end if;

  v_disc_id := nullif(v_quote->'discount'->>'id', '')::uuid;

  begin
    if v_disc_id is not null then
      update public.discounts
         set usage_count = usage_count + 1
       where id = v_disc_id
         and (usage_limit is null or usage_count < usage_limit);
      if not found then
        raise exception 'NONA_DISCOUNT_EXHAUSTED';
      end if;
    end if;

    insert into public.customers as cu
      (phone, full_name, phone2, wilaya_code, commune, address, user_id,
       accepts_marketing, marketing_consent_at, marketing_consent_source)
    values
      (v_phone, v_name, v_phone2, (p->>'wilaya_code')::int, v_commune, v_address,
       nullif(p->>'user_id', '')::uuid,
       v_marketing, case when v_marketing then now() end,
       case when v_marketing then 'checkout' end)
    on conflict (phone) do update set
      full_name   = excluded.full_name,
      phone2      = coalesce(excluded.phone2, cu.phone2),
      wilaya_code = excluded.wilaya_code,
      commune     = coalesce(excluded.commune, cu.commune),
      address     = excluded.address,
      user_id     = coalesce(cu.user_id, excluded.user_id),
      accepts_marketing = cu.accepts_marketing or excluded.accepts_marketing,
      marketing_consent_at = coalesce(cu.marketing_consent_at, excluded.marketing_consent_at),
      marketing_consent_source = coalesce(cu.marketing_consent_source, excluded.marketing_consent_source)
    returning cu.id into v_customer;

    insert into public.orders (
      status, customer_id, user_id, customer_name, customer_phone, customer_phone2,
      wilaya_code, wilaya_name, commune, address, delivery_type,
      subtotal, discount_id, discount_code, discount_amount,
      delivery_fee, delivery_fee_original, total, notes, locale,
      idempotency_key, payment_method, payment_status,
      flagged, flag_reason, attribution, ad_source)
    values (
      'not_confirmed', v_customer, nullif(p->>'user_id', '')::uuid,
      v_name, v_phone, v_phone2,
      (p->>'wilaya_code')::int, v_quote->>'wilaya_name', v_commune, v_address,
      coalesce(nullif(p->>'delivery_type', ''), 'home')::public.delivery_type,
      (v_quote->>'subtotal')::numeric, v_disc_id, v_quote->'discount'->>'code',
      (v_quote->>'discount_amount')::numeric,
      (v_quote->>'delivery_fee')::numeric, (v_quote->>'delivery_fee_original')::numeric,
      (v_quote->>'total')::numeric, v_notes, v_locale,
      v_key, 'cod', 'pending',
      v_flag_reason is not null, v_flag_reason,
      (case when jsonb_typeof(p->'utm') = 'object' then p->'utm' else '{}'::jsonb end)
        || jsonb_build_object('checkout', coalesce(nullif(left(p->>'source', 20), ''), 'storefront')),
      nullif(left(p->>'ad_source', 40), ''))
    returning id, order_number, public_token, total into v_order;

    for l in select * from jsonb_array_elements(v_quote->'lines') loop
      insert into public.order_items (
        order_id, product_id, variant_id, product_name, variant_label,
        size, color, sku, image_url, unit_price, quantity, line_total)
      values (
        v_order.id, (l->>'product_id')::uuid, (l->>'variant_id')::uuid,
        l->>'name', l->>'variant_label', l->>'size', l->>'color', l->>'sku',
        l->>'image_url', (l->>'unit_price')::numeric, (l->>'qty')::int,
        (l->>'line_total')::numeric);
    end loop;

    -- The abandoned-checkout lead for this phone is now an order.
    delete from public.leads where customer_phone = v_phone;

    insert into public.order_events (order_id, type, data)
    values (v_order.id, 'created', jsonb_build_object(
      'source', coalesce(nullif(p->>'source', ''), 'storefront'),
      'items', v_quote->'item_count',
      'flag', v_flag_reason));
  exception
    when unique_violation then
      -- Concurrent retry with the same idempotency key: return the winner.
      select id, order_number, public_token, total into v_existing
        from public.orders where idempotency_key = v_key;
      if found then
        return jsonb_build_object('ok', true, 'duplicate', true, 'order_id', v_existing.id,
          'order_number', v_existing.order_number, 'public_token', v_existing.public_token,
          'total', v_existing.total);
      end if;
      raise;
    when raise_exception then
      -- The block's writes are already rolled back at this point.
      if sqlerrm = 'NONA_DISCOUNT_EXHAUSTED' then
        return jsonb_build_object('ok', false, 'error', 'discount', 'reason', 'exhausted');
      end if;
      raise;
  end;

  return jsonb_build_object(
    'ok', true, 'duplicate', false,
    'order_id', v_order.id, 'order_number', v_order.order_number,
    'public_token', v_order.public_token,
    'subtotal', v_quote->'subtotal', 'discount_amount', v_quote->'discount_amount',
    'delivery_fee', v_quote->'delivery_fee', 'total', v_order.total,
    'item_count', v_quote->'item_count',
    'lines', (select coalesce(jsonb_agg(jsonb_build_object(
        'product_id', x->'product_id', 'qty', x->'qty', 'unit_price', x->'unit_price')), '[]'::jsonb)
      from jsonb_array_elements(v_quote->'lines') x));
end; $$;

-- ----------------------------------------------------------------
-- Staff status change with actor attribution. The triggers enforce the
-- transition, move stock and log the event.
-- ----------------------------------------------------------------
create or replace function public.admin_set_order_status(
  p_order uuid, p_status public.order_status, p_reason uuid, p_actor uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_old public.order_status;
begin
  perform set_config('app.actor_id', coalesce(p_actor::text, ''), true);

  select status into v_old from public.orders where id = p_order for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_old = p_status then
    return jsonb_build_object('ok', true, 'unchanged', true);
  end if;
  if not private.order_transition_allowed(v_old, p_status) then
    return jsonb_build_object('ok', false, 'error', 'invalid_transition',
      'from', v_old, 'to', p_status);
  end if;

  begin
    update public.orders set
      status = p_status,
      cancellation_reason_id = case when p_status = 'canceled' then p_reason
                                    else cancellation_reason_id end,
      return_reason_id = case when p_status = 'returned' then p_reason
                              else return_reason_id end
     where id = p_order;
  exception when check_violation then
    return jsonb_build_object('ok', false, 'error', 'stock');
  end;

  return jsonb_build_object('ok', true, 'from', v_old, 'to', p_status);
end; $$;

-- ----------------------------------------------------------------
-- Inventory adjustment: atomic, logged, never negative. When p_expected
-- is given and the stock changed meanwhile, nothing is written
-- (prevents lost updates from stale admin screens).
-- ----------------------------------------------------------------
create or replace function public.adjust_inventory(
  p_variant uuid, p_delta int, p_reason text, p_note text, p_actor uuid,
  p_expected int default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_stock int;
  v_product uuid;
begin
  if p_delta = 0 then
    return jsonb_build_object('ok', false, 'error', 'no_change');
  end if;
  if p_reason not in ('received', 'correction', 'damaged', 'count', 'returned', 'initial', 'other') then
    return jsonb_build_object('ok', false, 'error', 'invalid_reason');
  end if;

  select stock, product_id into v_stock, v_product
    from public.product_variants where id = p_variant for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if p_expected is not null and v_stock <> p_expected then
    return jsonb_build_object('ok', false, 'error', 'conflict', 'stock', v_stock);
  end if;
  if v_stock + p_delta < 0 then
    return jsonb_build_object('ok', false, 'error', 'negative', 'stock', v_stock);
  end if;

  update public.product_variants set stock = stock + p_delta
   where id = p_variant returning stock into v_stock;

  insert into public.inventory_logs (variant_id, product_id, change, reason, stock_after, created_by, note)
  values (p_variant, v_product, p_delta, p_reason, v_stock, p_actor, nullif(left(p_note, 500), ''));

  return jsonb_build_object('ok', true, 'stock', v_stock);
end; $$;

-- Only trusted server code (service role) may call these RPCs.
revoke execute on function public.quote_order(jsonb) from public, anon, authenticated;
revoke execute on function public.create_order(jsonb) from public, anon, authenticated;
revoke execute on function public.admin_set_order_status(uuid, public.order_status, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.adjust_inventory(uuid, int, text, text, uuid, int) from public, anon, authenticated;
grant execute on function public.quote_order(jsonb) to service_role;
grant execute on function public.create_order(jsonb) to service_role;
grant execute on function public.admin_set_order_status(uuid, public.order_status, uuid, uuid) to service_role;
grant execute on function public.adjust_inventory(uuid, int, text, text, uuid, int) to service_role;

-- ----------------------------------------------------------------
-- Backfill: customers from existing orders.
-- ----------------------------------------------------------------
insert into public.customers (phone, full_name, phone2, wilaya_code, commune, address)
select distinct on (customer_phone)
       customer_phone, customer_name, customer_phone2, wilaya_code, commune, address
  from public.orders
 order by customer_phone, created_at desc
on conflict (phone) do nothing;

update public.orders o set customer_id = c.id
  from public.customers c
 where o.customer_id is null and c.phone = o.customer_phone;

-- Existing canceled/returned orders were never "paid".
update public.orders set payment_status = 'voided'
 where payment_status = 'pending' and status = 'canceled';
update public.orders set payment_status = 'collected',
       cod_collected_amount = coalesce(cod_collected_amount, total),
       cod_collected_at = coalesce(cod_collected_at, delivered_at)
 where payment_status = 'pending' and status = 'delivered';
