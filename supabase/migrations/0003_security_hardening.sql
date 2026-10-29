-- ============================================================
-- NONA — 0003: security hardening
--  * configurable staff roles + permission checks (least privilege)
--  * RLS rewritten so staff writes require the matching permission
--    (previously ANY staff account could write ANY table via the REST API)
--  * audit log, DB-backed rate limiter, storage upload limits
-- Additive and idempotent. Backward compatible with the 0001 app code:
-- existing 'admin' accounts get every permission, 'manager' accounts get the
-- day-to-day operations permissions.
-- ============================================================

-- Policies reference private.* helpers by OID, so they work without this;
-- the grant only allows name-based use (e.g. in views). The schema itself is
-- not exposed through PostgREST.
grant usage on schema private to authenticated;

-- ----------------------------------------------------------------
-- Staff roles & permissions
-- ----------------------------------------------------------------
create table if not exists public.staff_roles (
  key         text primary key check (key ~ '^[a-z][a-z0-9_]{1,39}$'),
  name_ar     text not null,
  name_fr     text,
  name_en     text,
  permissions text[] not null default '{}',
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

insert into public.staff_roles (key, name_ar, name_fr, name_en, permissions, is_system) values
  ('owner', 'مالكة المتجر', 'Propriétaire', 'Store owner', '{*}', true),
  ('admin', 'مسؤول', 'Administrateur', 'Administrator', '{*}', true),
  ('manager', 'مديرة المتجر', 'Gérante', 'Store manager',
    '{dashboard.view,orders.view,orders.manage,orders.export,products.view,products.manage,inventory.view,inventory.adjust,customers.view,customers.manage,discounts.manage,content.manage,forms.view,reports.view}', true),
  ('product_manager', 'مسؤولة المنتجات', 'Responsable produits', 'Product manager',
    '{dashboard.view,products.view,products.manage,inventory.view,inventory.adjust,content.manage}', true),
  ('marketing_manager', 'مسؤولة التسويق', 'Responsable marketing', 'Marketing manager',
    '{dashboard.view,products.view,customers.view,discounts.manage,content.manage,marketing.manage,forms.view,reports.view}', true),
  ('fulfillment', 'مسؤولة الطلبات والتوصيل', 'Commandes & livraison', 'Order & fulfillment',
    '{dashboard.view,orders.view,orders.manage,orders.export,inventory.view,customers.view}', true),
  ('support', 'خدمة العملاء', 'Service client', 'Customer support',
    '{dashboard.view,orders.view,orders.manage,customers.view,customers.manage,forms.view}', true),
  ('analyst', 'محلّلة (قراءة فقط)', 'Analyste (lecture seule)', 'Read-only analyst',
    '{dashboard.view,orders.view,products.view,inventory.view,customers.view,reports.view}', true)
on conflict (key) do nothing;

alter table public.admins
  add column if not exists role_key text references public.staff_roles(key) on update cascade;

-- Backfill from the legacy enum column (admin → admin, manager → manager).
update public.admins set role_key = role::text where role_key is null;

-- Inserts that only set the legacy `role` (e.g. older scripts) still get a role_key.
create or replace function private.admins_default_role_key()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.role_key is null then
    new.role_key := new.role::text;
  end if;
  return new;
end; $$;

drop trigger if exists admins_default_role_key on public.admins;
create trigger admins_default_role_key before insert on public.admins
  for each row execute function private.admins_default_role_key();

alter table public.admins alter column role_key set not null;

create or replace function private.has_permission(uid uuid, perm text)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (
    select 1
      from public.admins a
      join public.staff_roles r on r.key = a.role_key
     where a.id = uid
       and a.is_active
       and ('*' = any(r.permissions) or perm = any(r.permissions))
  );
$$;

grant execute on function private.is_admin(uuid) to authenticated;
grant execute on function private.has_permission(uuid, text) to authenticated;

-- ----------------------------------------------------------------
-- RLS: staff can READ what the panel shows; WRITES need a permission.
-- (Server code writes through the service role after its own checks;
--  these policies stop a staff JWT from bypassing the app via REST.)
-- ----------------------------------------------------------------
alter table public.staff_roles enable row level security;

drop policy if exists staff_roles_select on public.staff_roles;
create policy staff_roles_select on public.staff_roles
  for select to authenticated using (private.is_admin(auth.uid()));
drop policy if exists staff_roles_write on public.staff_roles;
create policy staff_roles_write on public.staff_roles
  for all to authenticated
  using (private.has_permission(auth.uid(), 'staff.manage'))
  with check (private.has_permission(auth.uid(), 'staff.manage'));

-- Catalog
drop policy if exists categories_admin_all on public.categories;
drop policy if exists categories_staff_read on public.categories;
create policy categories_staff_read on public.categories
  for select to authenticated using (private.is_admin(auth.uid()));
drop policy if exists categories_staff_write on public.categories;
create policy categories_staff_write on public.categories
  for all to authenticated
  using (private.has_permission(auth.uid(), 'products.manage'))
  with check (private.has_permission(auth.uid(), 'products.manage'));

drop policy if exists products_admin_all on public.products;
drop policy if exists products_staff_read on public.products;
create policy products_staff_read on public.products
  for select to authenticated using (private.is_admin(auth.uid()));
drop policy if exists products_staff_write on public.products;
create policy products_staff_write on public.products
  for all to authenticated
  using (private.has_permission(auth.uid(), 'products.manage'))
  with check (private.has_permission(auth.uid(), 'products.manage'));

drop policy if exists product_images_admin_all on public.product_images;
drop policy if exists product_images_staff_read on public.product_images;
create policy product_images_staff_read on public.product_images
  for select to authenticated using (private.is_admin(auth.uid()));
drop policy if exists product_images_staff_write on public.product_images;
create policy product_images_staff_write on public.product_images
  for all to authenticated
  using (private.has_permission(auth.uid(), 'products.manage'))
  with check (private.has_permission(auth.uid(), 'products.manage'));

drop policy if exists variants_admin_all on public.product_variants;
drop policy if exists variants_staff_read on public.product_variants;
create policy variants_staff_read on public.product_variants
  for select to authenticated using (private.is_admin(auth.uid()));
drop policy if exists variants_staff_write on public.product_variants;
create policy variants_staff_write on public.product_variants
  for all to authenticated
  using (private.has_permission(auth.uid(), 'products.manage'))
  with check (private.has_permission(auth.uid(), 'products.manage'));

-- Customers' profiles
drop policy if exists users_admin_select on public.users;
create policy users_admin_select on public.users
  for select to authenticated using (private.has_permission(auth.uid(), 'customers.view'));

-- Orders
drop policy if exists orders_admin_all on public.orders;
drop policy if exists orders_staff_read on public.orders;
create policy orders_staff_read on public.orders
  for select to authenticated using (private.has_permission(auth.uid(), 'orders.view'));
drop policy if exists orders_staff_write on public.orders;
create policy orders_staff_write on public.orders
  for update to authenticated
  using (private.has_permission(auth.uid(), 'orders.manage'))
  with check (private.has_permission(auth.uid(), 'orders.manage'));

drop policy if exists order_items_admin_all on public.order_items;
drop policy if exists order_items_staff_read on public.order_items;
create policy order_items_staff_read on public.order_items
  for select to authenticated using (private.has_permission(auth.uid(), 'orders.view'));

-- Inventory history
drop policy if exists inventory_logs_admin_select on public.inventory_logs;
create policy inventory_logs_admin_select on public.inventory_logs
  for select to authenticated using (private.has_permission(auth.uid(), 'inventory.view'));

-- Delivery fees
drop policy if exists delivery_fees_admin_all on public.delivery_fees;
drop policy if exists delivery_fees_staff_write on public.delivery_fees;
create policy delivery_fees_staff_write on public.delivery_fees
  for all to authenticated
  using (private.has_permission(auth.uid(), 'settings.manage'))
  with check (private.has_permission(auth.uid(), 'settings.manage'));

-- Settings: non-public rows (e.g. marketing_secret) are no longer readable
-- by every staff account — only by roles that manage them.
drop policy if exists settings_admin_all on public.settings;
drop policy if exists settings_staff_all on public.settings;
create policy settings_staff_all on public.settings
  for all to authenticated
  using (
    private.has_permission(auth.uid(), 'settings.manage')
    or (key in ('marketing', 'marketing_secret')
        and private.has_permission(auth.uid(), 'marketing.manage'))
  )
  with check (
    private.has_permission(auth.uid(), 'settings.manage')
    or (key in ('marketing', 'marketing_secret')
        and private.has_permission(auth.uid(), 'marketing.manage'))
  );

-- Staff accounts
drop policy if exists admins_write on public.admins;
create policy admins_write on public.admins
  for all to authenticated
  using (private.has_permission(auth.uid(), 'staff.manage'))
  with check (private.has_permission(auth.uid(), 'staff.manage'));

-- Reason lookups
drop policy if exists cancel_reasons_admin_all on public.cancellation_reasons;
drop policy if exists cancel_reasons_staff_read on public.cancellation_reasons;
create policy cancel_reasons_staff_read on public.cancellation_reasons
  for select to authenticated using (private.is_admin(auth.uid()));
drop policy if exists cancel_reasons_staff_write on public.cancellation_reasons;
create policy cancel_reasons_staff_write on public.cancellation_reasons
  for all to authenticated
  using (private.has_permission(auth.uid(), 'settings.manage'))
  with check (private.has_permission(auth.uid(), 'settings.manage'));

drop policy if exists return_reasons_admin_all on public.return_reasons;
drop policy if exists return_reasons_staff_read on public.return_reasons;
create policy return_reasons_staff_read on public.return_reasons
  for select to authenticated using (private.is_admin(auth.uid()));
drop policy if exists return_reasons_staff_write on public.return_reasons;
create policy return_reasons_staff_write on public.return_reasons
  for all to authenticated
  using (private.has_permission(auth.uid(), 'settings.manage'))
  with check (private.has_permission(auth.uid(), 'settings.manage'));

-- Analytics
drop policy if exists analytics_admin_select on public.analytics;
create policy analytics_admin_select on public.analytics
  for select to authenticated using (private.has_permission(auth.uid(), 'reports.view'));

-- ----------------------------------------------------------------
-- Storage: uploads need products.manage or content.manage; the bucket
-- only accepts images up to 8 MB.
-- ----------------------------------------------------------------
update storage.buckets
   set file_size_limit = 8388608,
       allowed_mime_types = '{image/jpeg,image/png,image/webp,image/avif,image/gif}'
 where id = 'product-images';

drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images'
    and (private.has_permission(auth.uid(), 'products.manage')
         or private.has_permission(auth.uid(), 'content.manage')));

drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images'
    and (private.has_permission(auth.uid(), 'products.manage')
         or private.has_permission(auth.uid(), 'content.manage')))
  with check (bucket_id = 'product-images'
    and (private.has_permission(auth.uid(), 'products.manage')
         or private.has_permission(auth.uid(), 'content.manage')));

drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images'
    and (private.has_permission(auth.uid(), 'products.manage')
         or private.has_permission(auth.uid(), 'content.manage')));

-- ----------------------------------------------------------------
-- Audit log (written by trusted server code only)
-- ----------------------------------------------------------------
create table if not exists public.audit_logs (
  id            bigint generated always as identity primary key,
  actor_id      uuid,
  actor_email   text,
  action        text not null,
  resource_type text not null,
  resource_id   text,
  status        text not null default 'success' check (status in ('success', 'failure')),
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select to authenticated using (private.has_permission(auth.uid(), 'audit.view'));

create index if not exists idx_audit_created  on public.audit_logs(created_at desc);
create index if not exists idx_audit_resource on public.audit_logs(resource_type, resource_id);

-- ----------------------------------------------------------------
-- Rate limiter (fixed window). Serverless functions share no memory,
-- so limits live in the database. Service role only.
-- ----------------------------------------------------------------
create table if not exists public.rate_limits (
  key          text primary key,
  window_start timestamptz not null,
  hits         int not null
);
alter table public.rate_limits enable row level security;  -- no policies: service role only

create or replace function public.hit_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean language plpgsql set search_path = '' as $$
declare
  v_hits int;
  v_window interval := make_interval(secs => p_window_seconds);
begin
  insert into public.rate_limits as rl (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when rl.window_start < now() - v_window then 1 else rl.hits + 1 end,
    window_start = case when rl.window_start < now() - v_window then now() else rl.window_start end
  returning hits into v_hits;

  -- Opportunistic cleanup of stale windows.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_limit;
end; $$;

revoke execute on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;
