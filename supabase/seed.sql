-- ============================================================
-- NONA — seed data
-- Safe to re-run (uses ON CONFLICT / guards).
-- ============================================================

-- ---------------- Categories ----------------
insert into public.categories (slug, name_ar, name_fr, name_en, position) values
  ('lingerie',    'لانجري',     'Lingerie',    'Lingerie',    1),
  ('dresses',     'فساتين',     'Robes',       'Dresses',     2),
  ('robes',       'روبات',      'Peignoirs',   'Robes',       3),
  ('shoes',       'أحذية',      'Chaussures',  'Shoes',       4),
  ('accessories', 'إكسسوارات',  'Accessoires', 'Accessories', 5)
on conflict (slug) do nothing;

-- ---------------- Settings ----------------
insert into public.settings (key, value, is_public) values
  ('store',    '{"name":"NONA","phone":"","email":"","city":"البويرة","wilaya_code":10}', true),
  ('social',   '{"instagram":"","facebook":"","tiktok":"","whatsapp":""}', true),
  ('policies', '{"exchange_days":3,"return_days":3,"exchange_ar":"إمكانية الاستبدال خلال 3 أيام من الاستلام","exchange_fr":"Échange possible sous 3 jours","exchange_en":"Exchange within 3 days"}', true),
  ('delivery', '{"free_threshold":0,"default_days_min":2,"default_days_max":5}', true)
on conflict (key) do nothing;

-- ---------------- Cancellation reasons ----------------
insert into public.cancellation_reasons (label_ar, label_fr, label_en, position) values
  ('لم ترد على الهاتف',     'Ne répond pas',      'No answer',          1),
  ('تراجعت عن الطلب',       'A changé d''avis',   'Changed her mind',   2),
  ('السعر مرتفع',           'Prix trop élevé',    'Price too high',     3),
  ('رقم هاتف خاطئ',         'Mauvais numéro',     'Wrong phone number', 4),
  ('طلب مكرّر',             'Commande en double', 'Duplicate order',    5),
  ('مدة التوصيل طويلة',     'Délai trop long',    'Delivery too long',  6),
  ('سبب آخر',               'Autre',              'Other',              7)
on conflict do nothing;

-- ---------------- Return reasons ----------------
insert into public.return_reasons (label_ar, label_fr, label_en, position) values
  ('المقاس غير مناسب',      'Mauvaise taille',    'Wrong size',        1),
  ('غير مطابق للوصف',       'Non conforme',       'Not as described',  2),
  ('منتج تالف',             'Produit endommagé',  'Damaged product',   3),
  ('تغيّر الرأي',           'A changé d''avis',   'Changed her mind',  4),
  ('سبب آخر',               'Autre',              'Other',             5)
on conflict do nothing;

-- ---------------- Delivery fees: 58 wilayas ----------------
insert into public.delivery_fees (wilaya_code, name_ar, name_fr) values
  (1,'أدرار','Adrar'),(2,'الشلف','Chlef'),(3,'الأغواط','Laghouat'),
  (4,'أم البواقي','Oum El Bouaghi'),(5,'باتنة','Batna'),(6,'بجاية','Béjaïa'),
  (7,'بسكرة','Biskra'),(8,'بشار','Béchar'),(9,'البليدة','Blida'),
  (10,'البويرة','Bouira'),(11,'تمنراست','Tamanrasset'),(12,'تبسة','Tébessa'),
  (13,'تلمسان','Tlemcen'),(14,'تيارت','Tiaret'),(15,'تيزي وزو','Tizi Ouzou'),
  (16,'الجزائر','Alger'),(17,'الجلفة','Djelfa'),(18,'جيجل','Jijel'),
  (19,'سطيف','Sétif'),(20,'سعيدة','Saïda'),(21,'سكيكدة','Skikda'),
  (22,'سيدي بلعباس','Sidi Bel Abbès'),(23,'عنابة','Annaba'),(24,'قالمة','Guelma'),
  (25,'قسنطينة','Constantine'),(26,'المدية','Médéa'),(27,'مستغانم','Mostaganem'),
  (28,'المسيلة','M''Sila'),(29,'معسكر','Mascara'),(30,'ورقلة','Ouargla'),
  (31,'وهران','Oran'),(32,'البيض','El Bayadh'),(33,'إليزي','Illizi'),
  (34,'برج بوعريريج','Bordj Bou Arréridj'),(35,'بومرداس','Boumerdès'),(36,'الطارف','El Tarf'),
  (37,'تندوف','Tindouf'),(38,'تيسمسيلت','Tissemsilt'),(39,'الوادي','El Oued'),
  (40,'خنشلة','Khenchela'),(41,'سوق أهراس','Souk Ahras'),(42,'تيبازة','Tipaza'),
  (43,'ميلة','Mila'),(44,'عين الدفلى','Aïn Defla'),(45,'النعامة','Naâma'),
  (46,'عين تموشنت','Aïn Témouchent'),(47,'غرداية','Ghardaïa'),(48,'غليزان','Relizane'),
  (49,'تيميمون','Timimoun'),(50,'برج باجي مختار','Bordj Badji Mokhtar'),
  (51,'أولاد جلال','Ouled Djellal'),(52,'بني عباس','Béni Abbès'),
  (53,'عين صالح','In Salah'),(54,'عين قزام','In Guezzam'),(55,'تقرت','Touggourt'),
  (56,'جانت','Djanet'),(57,'المغير','El M''Ghair'),(58,'المنيعة','El Meniaa')
on conflict (wilaya_code) do nothing;

-- Default tiers: north/central 500/300, deep south 800/500, home wilaya cheaper
update public.delivery_fees set home_fee = 500, stopdesk_fee = 300;
update public.delivery_fees set home_fee = 800, stopdesk_fee = 500
  where wilaya_code in (1,3,7,8,11,30,32,33,37,39,45,47,49,50,51,52,53,54,55,56,57,58);
update public.delivery_fees set home_fee = 250, stopdesk_fee = 150 where wilaya_code = 10;

-- ---------------- Demo products ----------------
-- Idempotent: only seed when there are no products yet.
do $$
declare
  p_id uuid;
begin
  if exists (select 1 from public.products limit 1) then
    return;
  end if;

  -- 1) Lace lingerie set
  insert into public.products (slug, category_id, name_ar, name_fr, name_en,
      description_ar, price, compare_at_price, is_active, is_featured, is_best_seller,
      delivery_days_min, delivery_days_max)
  values ('lingerie-dentelle',
      (select id from public.categories where slug='lingerie'),
      'طقم لانجري دانتيل', 'Ensemble lingerie dentelle', 'Lace lingerie set',
      'طقم لانجري أنيق من الدانتيل الناعم، مريح وجذاب.', 2500, 3200, true, true, true, 2, 5)
  returning id into p_id;
  insert into public.product_images (product_id, url, position) values
    (p_id, 'https://picsum.photos/seed/nona-lingerie-1/600/800', 0),
    (p_id, 'https://picsum.photos/seed/nona-lingerie-2/600/800', 1);
  insert into public.product_variants (product_id, size, color, color_hex, stock, position) values
    (p_id, 'S', 'أسود', '#111111', 8, 0),
    (p_id, 'M', 'أسود', '#111111', 12, 1),
    (p_id, 'L', 'أسود', '#111111', 5, 2),
    (p_id, 'M', 'أحمر', '#c0392b', 6, 3);

  -- 2) Evening dress
  insert into public.products (slug, category_id, name_ar, name_fr, name_en,
      description_ar, price, is_active, is_featured, delivery_days_min, delivery_days_max)
  values ('robe-soiree',
      (select id from public.categories where slug='dresses'),
      'فستان سهرة', 'Robe de soirée', 'Evening dress',
      'فستان سهرة أنيق بقصّة عصرية يبرز إطلالتك.', 4800, true, true, 2, 6)
  returning id into p_id;
  insert into public.product_images (product_id, url, position) values
    (p_id, 'https://picsum.photos/seed/nona-dress-1/600/800', 0),
    (p_id, 'https://picsum.photos/seed/nona-dress-2/600/800', 1);
  insert into public.product_variants (product_id, size, color, color_hex, stock, position) values
    (p_id, 'S', 'وردي', '#f5d0d5', 4, 0),
    (p_id, 'M', 'وردي', '#f5d0d5', 7, 1),
    (p_id, 'L', 'وردي', '#f5d0d5', 3, 2);

  -- 3) Satin robe
  insert into public.products (slug, category_id, name_ar, name_fr, name_en,
      description_ar, price, is_active, is_best_seller, delivery_days_min, delivery_days_max)
  values ('robe-satin',
      (select id from public.categories where slug='robes'),
      'روب ساتان', 'Peignoir satin', 'Satin robe',
      'روب ساتان ناعم وفاخر الملمس، مثالي للراحة.', 3200, true, true, 2, 5)
  returning id into p_id;
  insert into public.product_images (product_id, url, position) values
    (p_id, 'https://picsum.photos/seed/nona-robe-1/600/800', 0);
  insert into public.product_variants (product_id, size, color, color_hex, stock, position) values
    (p_id, 'M', 'بيج', '#e8d5c4', 10, 0),
    (p_id, 'L', 'بيج', '#e8d5c4', 9, 1);

  -- 4) Heeled shoes
  insert into public.products (slug, category_id, name_ar, name_fr, name_en,
      description_ar, price, is_active, delivery_days_min, delivery_days_max)
  values ('chaussures-talon',
      (select id from public.categories where slug='shoes'),
      'حذاء بكعب', 'Chaussures à talon', 'Heeled shoes',
      'حذاء أنيق بكعب مريح يناسب كل المناسبات.', 3900, true, 3, 7)
  returning id into p_id;
  insert into public.product_images (product_id, url, position) values
    (p_id, 'https://picsum.photos/seed/nona-shoes-1/600/800', 0);
  insert into public.product_variants (product_id, size, color, color_hex, stock, position) values
    (p_id, '37', 'أسود', '#111111', 5, 0),
    (p_id, '38', 'أسود', '#111111', 6, 1),
    (p_id, '39', 'أسود', '#111111', 4, 2),
    (p_id, '40', 'أسود', '#111111', 2, 3);

  -- 5) Silk nightgown (new arrival)
  insert into public.products (slug, category_id, name_ar, name_fr, name_en,
      description_ar, price, compare_at_price, is_active, delivery_days_min, delivery_days_max)
  values ('chemise-soie',
      (select id from public.categories where slug='lingerie'),
      'قميص نوم حريري', 'Chemise de nuit en soie', 'Silk nightgown',
      'قميص نوم حريري بتصميم راقٍ وملمس ناعم.', 1900, 2400, true, 2, 5)
  returning id into p_id;
  insert into public.product_images (product_id, url, position) values
    (p_id, 'https://picsum.photos/seed/nona-night-1/600/800', 0);
  insert into public.product_variants (product_id, size, color, color_hex, stock, position) values
    (p_id, 'S', 'أبيض', '#ffffff', 7, 0),
    (p_id, 'M', 'أبيض', '#ffffff', 8, 1),
    (p_id, 'L', 'أبيض', '#ffffff', 6, 2);
end $$;
