-- ============================================================
-- NONA — storage: product images bucket
-- ============================================================

-- Public bucket (objects are readable via their public URL).
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Public read of objects in the bucket.
drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-images');

-- Admin-only writes (INSERT + UPDATE + DELETE; upsert needs all three).
drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and private.is_admin(auth.uid()));

drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and private.is_admin(auth.uid()))
  with check (bucket_id = 'product-images' and private.is_admin(auth.uid()));

drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and private.is_admin(auth.uid()));
