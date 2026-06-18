// Domain types matching the Postgres schema (supabase/migrations/0001_init.sql).
// Used across the app for typed query results. Numeric columns come back from
// PostgREST/supabase-js as `number`.

export type OrderStatus =
  | "not_confirmed"
  | "confirmed"
  | "in_delivery"
  | "delivered"
  | "returned"
  | "canceled";

export type DeliveryType = "home" | "stopdesk";
export type AdminRole = "admin" | "manager";

export type Category = {
  id: string;
  slug: string;
  name_ar: string;
  name_fr: string | null;
  name_en: string | null;
  image_url: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
};

export type Product = {
  id: string;
  slug: string;
  category_id: string | null;
  name_ar: string;
  name_fr: string | null;
  name_en: string | null;
  description_ar: string | null;
  description_fr: string | null;
  description_en: string | null;
  price: number;
  compare_at_price: number | null;
  currency: string;
  is_active: boolean;
  is_featured: boolean;
  is_best_seller: boolean;
  sold_count: number;
  total_stock: number;
  delivery_days_min: number | null;
  delivery_days_max: number | null;
  created_at: string;
  updated_at: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  alt_ar: string | null;
  alt_fr: string | null;
  alt_en: string | null;
  position: number;
  created_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  color_hex: string | null;
  sku: string | null;
  price_override: number | null;
  stock: number;
  position: number;
  is_active: boolean;
  created_at: string;
};

export type Order = {
  id: string;
  order_number: number;
  user_id: string | null;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  customer_phone2: string | null;
  wilaya_code: number;
  wilaya_name: string | null;
  commune: string | null;
  address: string;
  delivery_type: DeliveryType;
  delivery_fee: number;
  subtotal: number;
  total: number;
  notes: string | null;
  locale: string;
  cancellation_reason_id: string | null;
  return_reason_id: string | null;
  confirmed_at: string | null;
  delivered_at: string | null;
  canceled_at: string | null;
  returned_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_label: string | null;
  size: string | null;
  color: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  created_at: string;
};

export type DeliveryFee = {
  id: string;
  wilaya_code: number;
  name_ar: string;
  name_fr: string | null;
  home_fee: number;
  stopdesk_fee: number;
  is_active: boolean;
};

export type Setting<T = unknown> = {
  key: string;
  value: T;
  is_public: boolean;
  updated_at: string;
};

export type Reason = {
  id: string;
  label_ar: string;
  label_fr: string | null;
  label_en: string | null;
  position: number;
  is_active: boolean;
};

export type Admin = {
  id: string;
  role: AdminRole;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
};

export type Wishlist = {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
};

/** Product joined with its images, variants and category — used on the storefront. */
export type ProductWithRelations = Product & {
  images: ProductImage[];
  variants: ProductVariant[];
  category: Category | null;
};
