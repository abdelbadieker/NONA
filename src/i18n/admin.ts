import type { Locale } from "./config";
import type { OrderStatus } from "@/lib/types";

export type AdminText = {
  login: {
    title: string;
    subtitle: string;
    email: string;
    password: string;
    signIn: string;
    signingIn: string;
    withGoogle: string;
    or: string;
    error: string;
    notAdmin: string;
  };
  nav: {
    dashboard: string;
    orders: string;
    products: string;
    reasons: string;
    settings: string;
    logout: string;
    viewStore: string;
  };
  dashboard: {
    title: string;
    totalOrders: string;
    pending: string;
    delivered: string;
    revenue: string;
    products: string;
    recentOrders: string;
    none: string;
  };
  status: Record<OrderStatus, string>;
  orders: {
    title: string;
    all: string;
    order: string;
    customer: string;
    phone: string;
    wilaya: string;
    total: string;
    date: string;
    deliveryType: string;
    home: string;
    stopdesk: string;
    address: string;
    notes: string;
    items: string;
    quantity: string;
    subtotal: string;
    deliveryFee: string;
    changeStatus: string;
    selectReason: string;
    apply: string;
    empty: string;
    back: string;
    commune: string;
    errStock: string;
    errGeneric: string;
    updated: string;
  };
  products: {
    title: string;
    add: string;
    edit: string;
    name: string;
    slug: string;
    description: string;
    price: string;
    compareAt: string;
    category: string;
    noCategory: string;
    stock: string;
    images: string;
    imageUrl: string;
    addImage: string;
    variants: string;
    addVariant: string;
    size: string;
    color: string;
    colorHex: string;
    flags: string;
    active: string;
    featured: string;
    bestSeller: string;
    deliveryDays: string;
    hidden: string;
    empty: string;
    deleteConfirm: string;
    nameAr: string;
    nameFr: string;
    nameEn: string;
  };
  reasons: {
    title: string;
    cancellation: string;
    returns: string;
    label: string;
    add: string;
    empty: string;
  };
  settings: {
    title: string;
    storeName: string;
    phone: string;
    email: string;
    instagram: string;
    facebook: string;
    tiktok: string;
    whatsapp: string;
    deliveryFees: string;
    homeFee: string;
    stopdeskFee: string;
    marketing: string;
    metaPixel: string;
    capiToken: string;
    tiktokPixel: string;
    marketingHint: string;
    saved: string;
  };
  common: {
    save: string;
    saving: string;
    cancel: string;
    edit: string;
    delete: string;
    add: string;
    back: string;
    loading: string;
    actions: string;
    yes: string;
    no: string;
    search: string;
  };
};

const status: Record<Locale, Record<OrderStatus, string>> = {
  ar: {
    not_confirmed: "غير مؤكّد",
    confirmed: "مؤكّد",
    in_delivery: "قيد التوصيل",
    delivered: "تم التوصيل",
    returned: "مُرتجع",
    canceled: "ملغى",
  },
  fr: {
    not_confirmed: "Non confirmée",
    confirmed: "Confirmée",
    in_delivery: "En livraison",
    delivered: "Livrée",
    returned: "Retournée",
    canceled: "Annulée",
  },
  en: {
    not_confirmed: "Not confirmed",
    confirmed: "Confirmed",
    in_delivery: "In delivery",
    delivered: "Delivered",
    returned: "Returned",
    canceled: "Canceled",
  },
};

export const adminText: Record<Locale, AdminText> = {
  ar: {
    login: {
      title: "لوحة التحكم",
      subtitle: "تسجيل الدخول إلى إدارة NONA",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      signIn: "تسجيل الدخول",
      signingIn: "جارٍ الدخول…",
      withGoogle: "المتابعة بواسطة Google",
      or: "أو",
      error: "بيانات الدخول غير صحيحة",
      notAdmin: "هذا الحساب ليس مسؤولاً",
    },
    nav: {
      dashboard: "الرئيسية",
      orders: "الطلبات",
      products: "المنتجات",
      reasons: "الأسباب",
      settings: "الإعدادات",
      logout: "تسجيل الخروج",
      viewStore: "عرض المتجر",
    },
    dashboard: {
      title: "نظرة عامة",
      totalOrders: "إجمالي الطلبات",
      pending: "غير مؤكّدة",
      delivered: "تم توصيلها",
      revenue: "الإيرادات (مُوصّلة)",
      products: "المنتجات",
      recentOrders: "أحدث الطلبات",
      none: "لا توجد طلبات بعد",
    },
    status: status.ar,
    orders: {
      title: "الطلبات",
      all: "الكل",
      order: "الطلب",
      customer: "العميلة",
      phone: "الهاتف",
      wilaya: "الولاية",
      total: "المجموع",
      date: "التاريخ",
      deliveryType: "نوع التوصيل",
      home: "إلى المنزل",
      stopdesk: "إلى المكتب",
      address: "العنوان",
      notes: "ملاحظات",
      items: "المنتجات",
      quantity: "الكمية",
      subtotal: "المجموع الفرعي",
      deliveryFee: "رسوم التوصيل",
      changeStatus: "تغيير الحالة",
      selectReason: "اختر السبب",
      apply: "تطبيق",
      empty: "لا توجد طلبات",
      back: "العودة للطلبات",
      commune: "البلدية",
      errStock: "لا يمكن التأكيد: الكمية غير متوفرة في المخزون",
      errGeneric: "تعذّر تحديث الحالة",
      updated: "تم تحديث الحالة",
    },
    products: {
      title: "المنتجات",
      add: "إضافة منتج",
      edit: "تعديل المنتج",
      name: "الاسم",
      slug: "المعرّف (slug)",
      description: "الوصف",
      price: "السعر",
      compareAt: "السعر قبل التخفيض",
      category: "الفئة",
      noCategory: "بدون فئة",
      stock: "المخزون",
      images: "الصور",
      imageUrl: "رابط الصورة",
      addImage: "إضافة صورة",
      variants: "المتغيّرات",
      addVariant: "إضافة متغيّر",
      size: "المقاس",
      color: "اللون",
      colorHex: "كود اللون",
      flags: "الخيارات",
      active: "ظاهر",
      featured: "مميّز",
      bestSeller: "الأكثر مبيعًا",
      deliveryDays: "أيام التوصيل (من-إلى)",
      hidden: "مخفي",
      empty: "لا توجد منتجات",
      deleteConfirm: "حذف هذا المنتج نهائيًا؟",
      nameAr: "الاسم (عربي)",
      nameFr: "الاسم (فرنسي)",
      nameEn: "الاسم (إنجليزي)",
    },
    reasons: {
      title: "أسباب الإلغاء والإرجاع",
      cancellation: "أسباب الإلغاء",
      returns: "أسباب الإرجاع",
      label: "السبب",
      add: "إضافة",
      empty: "لا توجد عناصر",
    },
    settings: {
      title: "الإعدادات",
      storeName: "اسم المتجر",
      phone: "هاتف المتجر",
      email: "بريد المتجر",
      instagram: "إنستغرام",
      facebook: "فيسبوك",
      tiktok: "تيك توك",
      whatsapp: "واتساب",
      deliveryFees: "رسوم التوصيل",
      homeFee: "إلى المنزل",
      stopdeskFee: "إلى المكتب",
      marketing: "التسويق والبكسل",
      metaPixel: "معرّف Meta Pixel",
      capiToken: "رمز Conversions API (سري)",
      tiktokPixel: "معرّف TikTok Pixel",
      marketingHint: "انسخي المعرّفات من Meta Business Manager / TikTok Ads لتتبّع التحويلات.",
      saved: "تم الحفظ",
    },
    common: {
      save: "حفظ",
      saving: "جارٍ الحفظ…",
      cancel: "إلغاء",
      edit: "تعديل",
      delete: "حذف",
      add: "إضافة",
      back: "رجوع",
      loading: "جارٍ التحميل…",
      actions: "إجراءات",
      yes: "نعم",
      no: "لا",
      search: "بحث",
    },
  },
  fr: {
    login: {
      title: "Tableau de bord",
      subtitle: "Connexion à l'administration NONA",
      email: "E-mail",
      password: "Mot de passe",
      signIn: "Se connecter",
      signingIn: "Connexion…",
      withGoogle: "Continuer avec Google",
      or: "ou",
      error: "Identifiants invalides",
      notAdmin: "Ce compte n'est pas administrateur",
    },
    nav: {
      dashboard: "Accueil",
      orders: "Commandes",
      products: "Produits",
      reasons: "Motifs",
      settings: "Paramètres",
      logout: "Déconnexion",
      viewStore: "Voir la boutique",
    },
    dashboard: {
      title: "Vue d'ensemble",
      totalOrders: "Total commandes",
      pending: "Non confirmées",
      delivered: "Livrées",
      revenue: "Revenu (livré)",
      products: "Produits",
      recentOrders: "Commandes récentes",
      none: "Aucune commande",
    },
    status: status.fr,
    orders: {
      title: "Commandes",
      all: "Toutes",
      order: "Commande",
      customer: "Cliente",
      phone: "Téléphone",
      wilaya: "Wilaya",
      total: "Total",
      date: "Date",
      deliveryType: "Type de livraison",
      home: "À domicile",
      stopdesk: "Au bureau",
      address: "Adresse",
      notes: "Remarques",
      items: "Articles",
      quantity: "Quantité",
      subtotal: "Sous-total",
      deliveryFee: "Frais de livraison",
      changeStatus: "Changer le statut",
      selectReason: "Choisir le motif",
      apply: "Appliquer",
      empty: "Aucune commande",
      back: "Retour aux commandes",
      commune: "Commune",
      errStock: "Confirmation impossible : stock insuffisant",
      errGeneric: "Échec de la mise à jour du statut",
      updated: "Statut mis à jour",
    },
    products: {
      title: "Produits",
      add: "Ajouter un produit",
      edit: "Modifier le produit",
      name: "Nom",
      slug: "Identifiant (slug)",
      description: "Description",
      price: "Prix",
      compareAt: "Prix avant remise",
      category: "Catégorie",
      noCategory: "Sans catégorie",
      stock: "Stock",
      images: "Images",
      imageUrl: "URL de l'image",
      addImage: "Ajouter une image",
      variants: "Variantes",
      addVariant: "Ajouter une variante",
      size: "Taille",
      color: "Couleur",
      colorHex: "Code couleur",
      flags: "Options",
      active: "Visible",
      featured: "En vedette",
      bestSeller: "Meilleure vente",
      deliveryDays: "Jours de livraison (min-max)",
      hidden: "Masqué",
      empty: "Aucun produit",
      deleteConfirm: "Supprimer définitivement ce produit ?",
      nameAr: "Nom (arabe)",
      nameFr: "Nom (français)",
      nameEn: "Nom (anglais)",
    },
    reasons: {
      title: "Motifs d'annulation et de retour",
      cancellation: "Motifs d'annulation",
      returns: "Motifs de retour",
      label: "Motif",
      add: "Ajouter",
      empty: "Aucun élément",
    },
    settings: {
      title: "Paramètres",
      storeName: "Nom de la boutique",
      phone: "Téléphone",
      email: "E-mail",
      instagram: "Instagram",
      facebook: "Facebook",
      tiktok: "TikTok",
      whatsapp: "WhatsApp",
      deliveryFees: "Frais de livraison",
      homeFee: "À domicile",
      stopdeskFee: "Au bureau",
      marketing: "Marketing & Pixels",
      metaPixel: "ID Meta Pixel",
      capiToken: "Jeton Conversions API (secret)",
      tiktokPixel: "ID TikTok Pixel",
      marketingHint: "Copiez les ID depuis Meta Business Manager / TikTok Ads pour suivre les conversions.",
      saved: "Enregistré",
    },
    common: {
      save: "Enregistrer",
      saving: "Enregistrement…",
      cancel: "Annuler",
      edit: "Modifier",
      delete: "Supprimer",
      add: "Ajouter",
      back: "Retour",
      loading: "Chargement…",
      actions: "Actions",
      yes: "Oui",
      no: "Non",
      search: "Rechercher",
    },
  },
  en: {
    login: {
      title: "Dashboard",
      subtitle: "Sign in to NONA admin",
      email: "Email",
      password: "Password",
      signIn: "Sign in",
      signingIn: "Signing in…",
      withGoogle: "Continue with Google",
      or: "or",
      error: "Invalid credentials",
      notAdmin: "This account is not an admin",
    },
    nav: {
      dashboard: "Dashboard",
      orders: "Orders",
      products: "Products",
      reasons: "Reasons",
      settings: "Settings",
      logout: "Sign out",
      viewStore: "View store",
    },
    dashboard: {
      title: "Overview",
      totalOrders: "Total orders",
      pending: "Not confirmed",
      delivered: "Delivered",
      revenue: "Revenue (delivered)",
      products: "Products",
      recentOrders: "Recent orders",
      none: "No orders yet",
    },
    status: status.en,
    orders: {
      title: "Orders",
      all: "All",
      order: "Order",
      customer: "Customer",
      phone: "Phone",
      wilaya: "Wilaya",
      total: "Total",
      date: "Date",
      deliveryType: "Delivery type",
      home: "Home",
      stopdesk: "Stop desk",
      address: "Address",
      notes: "Notes",
      items: "Items",
      quantity: "Quantity",
      subtotal: "Subtotal",
      deliveryFee: "Delivery fee",
      changeStatus: "Change status",
      selectReason: "Select reason",
      apply: "Apply",
      empty: "No orders",
      back: "Back to orders",
      commune: "Commune",
      errStock: "Can't confirm: insufficient stock",
      errGeneric: "Could not update status",
      updated: "Status updated",
    },
    products: {
      title: "Products",
      add: "Add product",
      edit: "Edit product",
      name: "Name",
      slug: "Slug",
      description: "Description",
      price: "Price",
      compareAt: "Compare-at price",
      category: "Category",
      noCategory: "No category",
      stock: "Stock",
      images: "Images",
      imageUrl: "Image URL",
      addImage: "Add image",
      variants: "Variants",
      addVariant: "Add variant",
      size: "Size",
      color: "Color",
      colorHex: "Color hex",
      flags: "Options",
      active: "Visible",
      featured: "Featured",
      bestSeller: "Best seller",
      deliveryDays: "Delivery days (min-max)",
      hidden: "Hidden",
      empty: "No products",
      deleteConfirm: "Delete this product permanently?",
      nameAr: "Name (Arabic)",
      nameFr: "Name (French)",
      nameEn: "Name (English)",
    },
    reasons: {
      title: "Cancellation & return reasons",
      cancellation: "Cancellation reasons",
      returns: "Return reasons",
      label: "Reason",
      add: "Add",
      empty: "No items",
    },
    settings: {
      title: "Settings",
      storeName: "Store name",
      phone: "Store phone",
      email: "Store email",
      instagram: "Instagram",
      facebook: "Facebook",
      tiktok: "TikTok",
      whatsapp: "WhatsApp",
      deliveryFees: "Delivery fees",
      homeFee: "Home",
      stopdeskFee: "Stop desk",
      marketing: "Marketing & Pixels",
      metaPixel: "Meta Pixel ID",
      capiToken: "Conversions API token (secret)",
      tiktokPixel: "TikTok Pixel ID",
      marketingHint: "Copy the IDs from Meta Business Manager / TikTok Ads to track conversions.",
      saved: "Saved",
    },
    common: {
      save: "Save",
      saving: "Saving…",
      cancel: "Cancel",
      edit: "Edit",
      delete: "Delete",
      add: "Add",
      back: "Back",
      loading: "Loading…",
      actions: "Actions",
      yes: "Yes",
      no: "No",
      search: "Search",
    },
  },
};
