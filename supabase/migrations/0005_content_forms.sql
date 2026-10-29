-- ============================================================
-- NONA — 0005: content pages, forms, newsletter consent
-- Additive and idempotent.
-- ============================================================

-- ----------------------------------------------------------------
-- CMS pages (returns, privacy, terms, about, campaign pages…).
-- Bodies are plain text (paragraphs separated by blank lines) and are
-- always rendered escaped — no HTML is ever injected into the storefront.
-- ----------------------------------------------------------------
create table if not exists public.pages (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title_ar       text not null,
  title_fr       text,
  title_en       text,
  body_ar        text,
  body_fr        text,
  body_en        text,
  seo            jsonb not null default '{}'::jsonb,
  is_published   boolean not null default false,
  published_at   timestamptz,
  show_in_footer boolean not null default true,
  position       int not null default 0,
  updated_by     uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.pages enable row level security;

drop policy if exists pages_select_public on public.pages;
create policy pages_select_public on public.pages
  for select to anon, authenticated using (is_published);
drop policy if exists pages_staff_read on public.pages;
create policy pages_staff_read on public.pages
  for select to authenticated using (private.is_admin(auth.uid()));
drop policy if exists pages_staff_write on public.pages;
create policy pages_staff_write on public.pages
  for all to authenticated
  using (private.has_permission(auth.uid(), 'content.manage'))
  with check (private.has_permission(auth.uid(), 'content.manage'));

drop trigger if exists set_updated_at on public.pages;
create trigger set_updated_at before update on public.pages
  for each row execute function private.set_updated_at();

-- Draft starter pages (UNPUBLISHED — the store owner reviews, edits and
-- publishes them from Admin → Content).
insert into public.pages (slug, title_ar, title_fr, title_en, body_ar, body_fr, body_en, position) values
  ('returns',
   'الإرجاع والاستبدال', 'Retours et échanges', 'Returns & exchanges',
   E'يمكنكِ طلب الاستبدال خلال 3 أيام من تاريخ الاستلام، بشرط أن يكون المنتج بحالته الأصلية وغير مستعمل ومع تغليفه.\n\nلأسباب صحية، قد لا تُقبل بعض قطع اللانجري والملابس الداخلية للاستبدال بعد فتح التغليف.\n\nللطلب، تواصلي معنا عبر الهاتف أو واتساب مع ذكر رقم الطلب.',
   E'Vous pouvez demander un échange dans les 3 jours suivant la réception, à condition que l''article soit dans son état d''origine, non porté et dans son emballage.\n\nPour des raisons d''hygiène, certains articles de lingerie peuvent ne pas être échangeables une fois l''emballage ouvert.\n\nContactez-nous par téléphone ou WhatsApp en indiquant votre numéro de commande.',
   E'You can request an exchange within 3 days of receiving your order, provided the item is in its original condition, unworn and in its packaging.\n\nFor hygiene reasons, some lingerie items may not be exchangeable once the packaging is opened.\n\nContact us by phone or WhatsApp with your order number.',
   1),
  ('privacy',
   'سياسة الخصوصية', 'Politique de confidentialité', 'Privacy policy',
   E'نجمع فقط المعلومات اللازمة لتنفيذ طلبكِ: الاسم، رقم الهاتف، الولاية والعنوان.\n\nتُستخدم هذه المعلومات لتأكيد الطلب وتوصيله والتواصل معكِ بخصوصه، ولا نبيعها لأي طرف.\n\nلا نرسل رسائل تسويقية إلا بموافقتكِ، ويمكنكِ إلغاء الاشتراك في أي وقت.',
   E'Nous collectons uniquement les informations nécessaires à votre commande : nom, téléphone, wilaya et adresse.\n\nElles servent à confirmer, livrer et suivre votre commande et ne sont jamais vendues.\n\nNous n''envoyons de messages marketing qu''avec votre accord ; vous pouvez vous désinscrire à tout moment.',
   E'We only collect the information needed to fulfil your order: name, phone number, wilaya and address.\n\nIt is used to confirm, deliver and follow up on your order, and is never sold.\n\nWe only send marketing messages with your consent, and you can unsubscribe at any time.',
   2),
  ('terms',
   'الشروط والأحكام', 'Conditions générales', 'Terms & conditions',
   E'الأسعار معروضة بالدينار الجزائري. يتم الدفع نقداً عند الاستلام.\n\nيُعتبر الطلب نهائياً بعد تأكيده هاتفياً من فريقنا.\n\nرسوم التوصيل تختلف حسب الولاية ونوع التوصيل وتظهر قبل تأكيد الطلب.',
   E'Les prix sont affichés en dinars algériens. Le paiement se fait en espèces à la livraison.\n\nLa commande est définitive après confirmation téléphonique par notre équipe.\n\nLes frais de livraison dépendent de la wilaya et du mode de livraison et sont affichés avant la confirmation.',
   E'Prices are shown in Algerian dinars. Payment is cash on delivery.\n\nAn order is final once our team has confirmed it by phone.\n\nDelivery fees depend on the wilaya and delivery type and are shown before you confirm.',
   3),
  ('about',
   'من نحن', 'À propos', 'About us',
   E'NONA متجر نسائي جزائري للانجري والفساتين والروبات والأحذية.',
   E'NONA est une boutique algérienne de lingerie, robes, peignoirs et chaussures.',
   E'NONA is an Algerian store for lingerie, dresses, robes and shoes.',
   0)
on conflict (slug) do nothing;

-- ----------------------------------------------------------------
-- Form submissions (contact, wholesale). Inserted by server code only.
-- ----------------------------------------------------------------
create table if not exists public.form_submissions (
  id         uuid primary key default gen_random_uuid(),
  form       text not null check (form in ('contact', 'wholesale')),
  name       text,
  phone      text,
  email      text,
  message    text,
  locale     text,
  status     text not null default 'new' check (status in ('new', 'read', 'archived')),
  ip_hash    text,
  created_at timestamptz not null default now()
);
alter table public.form_submissions enable row level security;

drop policy if exists form_submissions_staff_read on public.form_submissions;
create policy form_submissions_staff_read on public.form_submissions
  for select to authenticated using (private.has_permission(auth.uid(), 'forms.view'));
drop policy if exists form_submissions_staff_update on public.form_submissions;
create policy form_submissions_staff_update on public.form_submissions
  for update to authenticated
  using (private.has_permission(auth.uid(), 'forms.view'))
  with check (private.has_permission(auth.uid(), 'forms.view'));

create index if not exists idx_form_submissions_created on public.form_submissions(created_at desc);

-- ----------------------------------------------------------------
-- Newsletter subscribers: explicit consent record + unsubscribe token.
-- A phone or email existing in `orders` is NOT consent.
-- ----------------------------------------------------------------
create table if not exists public.subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             text not null unique,
  locale            text,
  status            text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  consent_at        timestamptz not null default now(),
  consent_source    text,
  unsubscribed_at   timestamptz,
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  created_at        timestamptz not null default now()
);
alter table public.subscribers enable row level security;

drop policy if exists subscribers_staff_read on public.subscribers;
create policy subscribers_staff_read on public.subscribers
  for select to authenticated
  using (private.has_permission(auth.uid(), 'customers.view')
         or private.has_permission(auth.uid(), 'marketing.manage'));
