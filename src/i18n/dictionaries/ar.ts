// Arabic is the canonical dictionary. Its shape defines `Dictionary`,
// so fr.ts and en.ts must provide the same keys.
export const ar = {
  meta: {
    title: "NONA — متجر نسائي",
    description:
      "NONA متجر نسائي عصري في الجزائر. لانجري، فساتين، روبات وأحذية مع الدفع عند الاستلام وتوصيل لكل الولايات.",
  },
  nav: {
    home: "الرئيسية",
    shop: "المتجر",
    search: "البحث",
    wishlist: "المفضلة",
  },
  header: {
    searchPlaceholder: "ابحثي عن منتج…",
    skipToContent: "تخطّي إلى المحتوى",
  },
  language: {
    label: "اللغة",
    change: "تغيير اللغة",
  },
  home: {
    heroBadge: "وصل حديثًا",
    heroTitle: "أناقتكِ تبدأ من هنا",
    heroSubtitle:
      "لانجري، فساتين، روبات وأحذية مختارة بعناية — بالدفع عند الاستلام في كل الجزائر.",
    heroCta: "تسوّقي الآن",
    heroSecondary: "اكتشفي الفئات",
    featured: "منتجات مميّزة",
    categories: "تسوّقي حسب الفئة",
    bestSellers: "الأكثر مبيعًا",
    newArrivals: "وصل حديثًا",
    reviews: "آراء عميلاتنا",
    faq: "أسئلة شائعة",
    viewAll: "عرض الكل",
    comingSoon: "قريبًا",
    trustCod: "الدفع عند الاستلام",
    trustDelivery: "توصيل لكل الولايات",
    trustExchange: "إمكانية الاستبدال",
  },
  product: {
    orderNow: "اطلبيه الآن",
    addToWishlist: "أضيفي للمفضلة",
    inStock: "متوفر",
    limited: "كمية محدودة",
    soldOut: "نفدت الكمية",
    onlyLeft: "تبقّى {count} قطع فقط",
    size: "المقاس",
    color: "اللون",
    quantity: "الكمية",
    description: "الوصف",
    delivery: "التوصيل",
    bestSeller: "الأكثر طلبًا",
  },
  footer: {
    tagline: "متجر نسائي عصري — أناقة بأسعار في المتناول.",
    shopTitle: "التسوّق",
    helpTitle: "المساعدة",
    aboutUs: "من نحن",
    contact: "اتصلي بنا",
    shipping: "التوصيل",
    returns: "الإرجاع والاستبدال",
    faq: "الأسئلة الشائعة",
    cod: "الدفع عند الاستلام",
    delivery: "توصيل لكل الولايات",
    exchange: "إمكانية الاستبدال",
    rights: "جميع الحقوق محفوظة",
    madeIn: "صُنع بحبّ في الجزائر",
  },
  common: {
    currency: "دج",
    loading: "جارٍ التحميل…",
    backToHome: "العودة إلى الرئيسية",
    notFoundTitle: "الصفحة غير موجودة",
    notFoundText: "عذرًا، لم نتمكّن من إيجاد ما تبحثين عنه.",
    error: "حدث خطأ ما",
  },
} satisfies Dictionary;

// Structural shape derived from a generic version of the dictionary.
// (Defined separately so AR/FR/EN are all validated against the same shape.)
export type Dictionary = {
  meta: { title: string; description: string };
  nav: { home: string; shop: string; search: string; wishlist: string };
  header: { searchPlaceholder: string; skipToContent: string };
  language: { label: string; change: string };
  home: {
    heroBadge: string;
    heroTitle: string;
    heroSubtitle: string;
    heroCta: string;
    heroSecondary: string;
    featured: string;
    categories: string;
    bestSellers: string;
    newArrivals: string;
    reviews: string;
    faq: string;
    viewAll: string;
    comingSoon: string;
    trustCod: string;
    trustDelivery: string;
    trustExchange: string;
  };
  product: {
    orderNow: string;
    addToWishlist: string;
    inStock: string;
    limited: string;
    soldOut: string;
    onlyLeft: string;
    size: string;
    color: string;
    quantity: string;
    description: string;
    delivery: string;
    bestSeller: string;
  };
  footer: {
    tagline: string;
    shopTitle: string;
    helpTitle: string;
    aboutUs: string;
    contact: string;
    shipping: string;
    returns: string;
    faq: string;
    cod: string;
    delivery: string;
    exchange: string;
    rights: string;
    madeIn: string;
  };
  common: {
    currency: string;
    loading: string;
    backToHome: string;
    notFoundTitle: string;
    notFoundText: string;
    error: string;
  };
};
