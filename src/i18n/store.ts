import type { Locale } from "./config";
import type { OrderStatus } from "@/lib/types";

export type StoreText = {
  nav: { cart: string; track: string };
  cart: {
    title: string;
    empty: string;
    emptyText: string;
    continue: string;
    checkout: string;
    remove: string;
    subtotal: string;
    items: string;
    addToCart: string;
    added: string;
    viewCart: string;
    buyNow: string;
    unavailable: string;
    onlyAvailable: string;
    freeShippingProgress: string;
    freeShippingReached: string;
    estimateNote: string;
    loadError: string;
  };
  discount: {
    label: string;
    placeholder: string;
    apply: string;
    remove: string;
    applied: string;
    errors: Record<string, string>;
  };
  checkout: {
    freeShipping: string;
    discount: string;
    marketingConsent: string;
    wilayaUnavailable: string;
    unavailableItem: string;
    rate: string;
    selectWilayaForFee: string;
    trackLink: string;
  };
  track: {
    title: string;
    intro: string;
    orderNumber: string;
    phone: string;
    submit: string;
    searching: string;
    notFound: string;
    rate: string;
    invalid: string;
    status: Record<OrderStatus, string>;
    steps: { placed: string; confirmed: string; shipped: string; delivered: string };
    canceled: string;
    returned: string;
    carrier: string;
    trackingNumber: string;
    items: string;
    total: string;
    deliveryFee: string;
    discount: string;
    subtotal: string;
    home: string;
    stopdesk: string;
    help: string;
    another: string;
  };
  pages: {
    faqTitle: string;
    shippingTitle: string;
    shippingIntro: string;
    wilaya: string;
    home: string;
    stopdesk: string;
    freeOver: string;
    notAvailable: string;
    deliveryDays: string;
    contactTitle: string;
    contactIntro: string;
    call: string;
    whatsapp: string;
    email: string;
  };
  forms: {
    name: string;
    phone: string;
    email: string;
    message: string;
    send: string;
    sending: string;
    sent: string;
    error: string;
    rate: string;
    invalid: string;
    newsletterTitle: string;
    newsletterText: string;
    newsletterConsent: string;
    subscribe: string;
    subscribed: string;
  };
  product: {
    details: string;
    material: string;
    care: string;
    fit: string;
    sizeGuide: string;
    model: string;
    related: string;
  };
  reviews: {
    title: string;
    leave: string;
    name: string;
    rating: string;
    body: string;
    submit: string;
    sending: string;
    thanks: string;
    error: string;
    rate: string;
    invalid: string;
    count: string;
    close: string;
  };
  landing: { previewOnly: string; draftBanner: string };
};

const statusAr: Record<OrderStatus, string> = {
  not_confirmed: "بانتظار التأكيد",
  confirmed: "تم التأكيد",
  in_delivery: "قيد التوصيل",
  delivered: "تم التوصيل",
  returned: "مُرتجع",
  canceled: "ملغى",
};
const statusFr: Record<OrderStatus, string> = {
  not_confirmed: "En attente de confirmation",
  confirmed: "Confirmée",
  in_delivery: "En cours de livraison",
  delivered: "Livrée",
  returned: "Retournée",
  canceled: "Annulée",
};
const statusEn: Record<OrderStatus, string> = {
  not_confirmed: "Awaiting confirmation",
  confirmed: "Confirmed",
  in_delivery: "Out for delivery",
  delivered: "Delivered",
  returned: "Returned",
  canceled: "Canceled",
};

export const storeText: Record<Locale, StoreText> = {
  ar: {
    nav: { cart: "السلة", track: "تتبّع الطلب" },
    cart: {
      title: "سلة التسوق",
      empty: "سلتكِ فارغة",
      emptyText: "أضيفي منتجات إلى السلة ثم أكملي الطلب.",
      continue: "مواصلة التسوق",
      checkout: "إتمام الطلب",
      remove: "حذف",
      subtotal: "المجموع الفرعي",
      items: "منتجات",
      addToCart: "أضيفي إلى السلة",
      added: "تمت الإضافة إلى السلة",
      viewCart: "عرض السلة",
      buyNow: "اطلبيه الآن",
      unavailable: "هذا المنتج لم يعد متوفراً — احذفيه من السلة للمتابعة.",
      onlyAvailable: "متوفر {count} فقط",
      freeShippingProgress: "أضيفي {amount} للحصول على توصيل مجاني",
      freeShippingReached: "🎉 طلبكِ مؤهّل للتوصيل المجاني",
      estimateNote: "رسوم التوصيل تُحسب في الخطوة التالية حسب الولاية.",
      loadError: "تعذّر تحميل السلة، حاولي مرة أخرى.",
    },
    discount: {
      label: "كود التخفيض",
      placeholder: "أدخلي الكود",
      apply: "تطبيق",
      remove: "إزالة",
      applied: "تم تطبيق التخفيض",
      errors: {
        invalid: "الكود غير صالح",
        expired: "انتهت صلاحية الكود",
        not_started: "الكود غير مفعّل بعد",
        exhausted: "تم استنفاد هذا الكود",
        already_used: "سبق لكِ استعمال هذا الكود",
        min_subtotal: "المبلغ الأدنى للطلب غير كافٍ لهذا الكود",
        min_quantity: "عدد القطع غير كافٍ لهذا الكود",
        not_applicable: "الكود لا ينطبق على منتجات سلتكِ",
      },
    },
    checkout: {
      freeShipping: "مجاني",
      discount: "التخفيض",
      marketingConsent: "أوافق على تلقي العروض والتخفيضات (يمكن إلغاء ذلك في أي وقت)",
      wilayaUnavailable: "التوصيل غير متاح حالياً لهذه الولاية أو لهذا النوع من التوصيل",
      unavailableItem: "أحد المنتجات لم يعد متوفراً — راجعي السلة",
      rate: "محاولات كثيرة، انتظري قليلاً ثم أعيدي المحاولة",
      selectWilayaForFee: "اختاري الولاية لحساب رسوم التوصيل",
      trackLink: "تتبّعي طلبكِ",
    },
    track: {
      title: "تتبّع طلبكِ",
      intro: "أدخلي رقم الطلب ورقم الهاتف المستعمل عند الطلب.",
      orderNumber: "رقم الطلب",
      phone: "رقم الهاتف",
      submit: "تتبّع",
      searching: "جارٍ البحث…",
      notFound: "لم نجد طلباً بهذه المعلومات. تحقّقي من الرقمين.",
      rate: "محاولات كثيرة، أعيدي المحاولة بعد قليل.",
      invalid: "تحقّقي من رقم الطلب ورقم الهاتف.",
      status: statusAr,
      steps: { placed: "تم استلام الطلب", confirmed: "تم التأكيد", shipped: "قيد التوصيل", delivered: "تم التوصيل" },
      canceled: "تم إلغاء هذا الطلب.",
      returned: "تم إرجاع هذا الطلب.",
      carrier: "شركة التوصيل",
      trackingNumber: "رقم التتبّع",
      items: "المنتجات",
      total: "المجموع",
      deliveryFee: "التوصيل",
      discount: "التخفيض",
      subtotal: "المجموع الفرعي",
      home: "إلى المنزل",
      stopdesk: "إلى المكتب",
      help: "لأي استفسار تواصلي معنا.",
      another: "تتبّع طلب آخر",
    },
    pages: {
      faqTitle: "الأسئلة الشائعة",
      shippingTitle: "التوصيل والرسوم",
      shippingIntro: "نوصل إلى كل الولايات مع الدفع عند الاستلام. الرسوم حسب الولاية ونوع التوصيل:",
      wilaya: "الولاية",
      home: "إلى المنزل",
      stopdesk: "إلى المكتب",
      freeOver: "التوصيل مجاني للطلبات ابتداءً من {amount}",
      notAvailable: "غير متاح",
      deliveryDays: "مدة التوصيل عادةً من {min} إلى {max} أيام.",
      contactTitle: "اتصلي بنا",
      contactIntro: "نحن هنا لمساعدتكِ. راسلينا وسنرد عليكِ في أقرب وقت.",
      call: "اتصال",
      whatsapp: "واتساب",
      email: "البريد",
    },
    forms: {
      name: "الاسم",
      phone: "الهاتف",
      email: "البريد الإلكتروني",
      message: "رسالتكِ",
      send: "إرسال",
      sending: "جارٍ الإرسال…",
      sent: "شكراً! تم استلام رسالتكِ.",
      error: "تعذّر الإرسال، حاولي مرة أخرى.",
      rate: "تم إرسال رسائل كثيرة، حاولي لاحقاً.",
      invalid: "تحقّقي من الحقول (الهاتف أو البريد مطلوب).",
      newsletterTitle: "النشرة البريدية",
      newsletterText: "كوني أول من يعلم بالتشكيلات الجديدة والعروض.",
      newsletterConsent: "أوافق على تلقي رسائل NONA التسويقية",
      subscribe: "اشتراك",
      subscribed: "تم الاشتراك 💕",
    },
    product: {
      details: "التفاصيل",
      material: "الخامة",
      care: "العناية",
      fit: "القصّة والمقاس",
      sizeGuide: "دليل المقاسات",
      model: "معلومات العارضة",
      related: "قد يعجبكِ أيضًا",
    },
    reviews: {
      title: "آراء عميلاتنا",
      leave: "اتركي تقييمك",
      name: "الاسم",
      rating: "التقييم",
      body: "رأيكِ (اختياري)",
      submit: "إرسال التقييم",
      sending: "جارٍ الإرسال…",
      thanks: "شكراً! سيظهر تقييمكِ بعد المراجعة 💕",
      error: "تعذّر الإرسال، حاولي مرة أخرى.",
      rate: "أرسلتِ تقييمات كثيرة، حاولي لاحقاً.",
      invalid: "أدخلي اسمكِ واختاري عدد النجوم.",
      count: "{count} تقييم",
      close: "إغلاق",
    },
    landing: {
      previewOnly: "هذه معاينة لمسودة — الطلب غير مفعّل قبل النشر.",
      draftBanner: "معاينة مسودة — غير منشورة",
    },
  },
  fr: {
    nav: { cart: "Panier", track: "Suivre ma commande" },
    cart: {
      title: "Panier",
      empty: "Votre panier est vide",
      emptyText: "Ajoutez des articles puis finalisez votre commande.",
      continue: "Continuer les achats",
      checkout: "Commander",
      remove: "Retirer",
      subtotal: "Sous-total",
      items: "articles",
      addToCart: "Ajouter au panier",
      added: "Ajouté au panier",
      viewCart: "Voir le panier",
      buyNow: "Commander maintenant",
      unavailable: "Cet article n'est plus disponible — retirez-le pour continuer.",
      onlyAvailable: "Plus que {count} disponible(s)",
      freeShippingProgress: "Plus que {amount} pour la livraison gratuite",
      freeShippingReached: "🎉 Votre commande bénéficie de la livraison gratuite",
      estimateNote: "Les frais de livraison sont calculés à l'étape suivante selon la wilaya.",
      loadError: "Impossible de charger le panier, réessayez.",
    },
    discount: {
      label: "Code promo",
      placeholder: "Saisir le code",
      apply: "Appliquer",
      remove: "Retirer",
      applied: "Réduction appliquée",
      errors: {
        invalid: "Code invalide",
        expired: "Ce code a expiré",
        not_started: "Ce code n'est pas encore actif",
        exhausted: "Ce code n'est plus disponible",
        already_used: "Vous avez déjà utilisé ce code",
        min_subtotal: "Montant minimum non atteint pour ce code",
        min_quantity: "Nombre d'articles insuffisant pour ce code",
        not_applicable: "Ce code ne s'applique pas à votre panier",
      },
    },
    checkout: {
      freeShipping: "Gratuite",
      discount: "Réduction",
      marketingConsent: "J'accepte de recevoir les offres et promotions (désinscription possible à tout moment)",
      wilayaUnavailable: "Livraison indisponible pour cette wilaya ou ce mode",
      unavailableItem: "Un article n'est plus disponible — vérifiez le panier",
      rate: "Trop de tentatives, patientez puis réessayez",
      selectWilayaForFee: "Choisissez la wilaya pour calculer la livraison",
      trackLink: "Suivre ma commande",
    },
    track: {
      title: "Suivre ma commande",
      intro: "Saisissez le numéro de commande et le téléphone utilisé lors de la commande.",
      orderNumber: "Numéro de commande",
      phone: "Téléphone",
      submit: "Suivre",
      searching: "Recherche…",
      notFound: "Aucune commande trouvée avec ces informations.",
      rate: "Trop de tentatives, réessayez dans un moment.",
      invalid: "Vérifiez le numéro de commande et le téléphone.",
      status: statusFr,
      steps: { placed: "Commande reçue", confirmed: "Confirmée", shipped: "En livraison", delivered: "Livrée" },
      canceled: "Cette commande a été annulée.",
      returned: "Cette commande a été retournée.",
      carrier: "Transporteur",
      trackingNumber: "N° de suivi",
      items: "Articles",
      total: "Total",
      deliveryFee: "Livraison",
      discount: "Réduction",
      subtotal: "Sous-total",
      home: "À domicile",
      stopdesk: "Au bureau",
      help: "Une question ? Contactez-nous.",
      another: "Suivre une autre commande",
    },
    pages: {
      faqTitle: "Questions fréquentes",
      shippingTitle: "Livraison et frais",
      shippingIntro: "Nous livrons dans toutes les wilayas avec paiement à la livraison. Tarifs par wilaya :",
      wilaya: "Wilaya",
      home: "À domicile",
      stopdesk: "Au bureau",
      freeOver: "Livraison gratuite dès {amount}",
      notAvailable: "Indisponible",
      deliveryDays: "Délai habituel : {min} à {max} jours.",
      contactTitle: "Contact",
      contactIntro: "Nous sommes là pour vous aider. Écrivez-nous, nous répondons rapidement.",
      call: "Appeler",
      whatsapp: "WhatsApp",
      email: "E-mail",
    },
    forms: {
      name: "Nom",
      phone: "Téléphone",
      email: "E-mail",
      message: "Votre message",
      send: "Envoyer",
      sending: "Envoi…",
      sent: "Merci ! Votre message a bien été reçu.",
      error: "Échec de l'envoi, réessayez.",
      rate: "Trop de messages envoyés, réessayez plus tard.",
      invalid: "Vérifiez les champs (téléphone ou e-mail requis).",
      newsletterTitle: "Newsletter",
      newsletterText: "Soyez la première informée des nouveautés et offres.",
      newsletterConsent: "J'accepte de recevoir les e-mails marketing de NONA",
      subscribe: "S'inscrire",
      subscribed: "Inscription confirmée 💕",
    },
    product: {
      details: "Détails",
      material: "Matière",
      care: "Entretien",
      fit: "Coupe et taille",
      sizeGuide: "Guide des tailles",
      model: "Mannequin",
      related: "Vous aimerez aussi",
    },
    reviews: {
      title: "Avis de nos clientes",
      leave: "Laisser un avis",
      name: "Nom",
      rating: "Note",
      body: "Votre avis (optionnel)",
      submit: "Envoyer l'avis",
      sending: "Envoi…",
      thanks: "Merci ! Votre avis sera publié après vérification 💕",
      error: "Échec de l'envoi, réessayez.",
      rate: "Trop d'avis envoyés, réessayez plus tard.",
      invalid: "Saisissez votre nom et choisissez une note.",
      count: "{count} avis",
      close: "Fermer",
    },
    landing: {
      previewOnly: "Aperçu d'un brouillon — la commande est désactivée avant publication.",
      draftBanner: "Aperçu du brouillon — non publié",
    },
  },
  en: {
    nav: { cart: "Cart", track: "Track order" },
    cart: {
      title: "Cart",
      empty: "Your cart is empty",
      emptyText: "Add items to your cart, then check out.",
      continue: "Continue shopping",
      checkout: "Checkout",
      remove: "Remove",
      subtotal: "Subtotal",
      items: "items",
      addToCart: "Add to cart",
      added: "Added to cart",
      viewCart: "View cart",
      buyNow: "Order now",
      unavailable: "This item is no longer available — remove it to continue.",
      onlyAvailable: "Only {count} available",
      freeShippingProgress: "Add {amount} more for free delivery",
      freeShippingReached: "🎉 Your order qualifies for free delivery",
      estimateNote: "Delivery is calculated at the next step based on your wilaya.",
      loadError: "Couldn't load your cart, please try again.",
    },
    discount: {
      label: "Discount code",
      placeholder: "Enter code",
      apply: "Apply",
      remove: "Remove",
      applied: "Discount applied",
      errors: {
        invalid: "Invalid code",
        expired: "This code has expired",
        not_started: "This code isn't active yet",
        exhausted: "This code is no longer available",
        already_used: "You've already used this code",
        min_subtotal: "Order minimum not reached for this code",
        min_quantity: "Not enough items for this code",
        not_applicable: "This code doesn't apply to your cart",
      },
    },
    checkout: {
      freeShipping: "Free",
      discount: "Discount",
      marketingConsent: "Send me offers and promotions (unsubscribe anytime)",
      wilayaUnavailable: "Delivery isn't available for this wilaya or delivery type",
      unavailableItem: "An item is no longer available — please review your cart",
      rate: "Too many attempts, please wait and try again",
      selectWilayaForFee: "Choose your wilaya to calculate delivery",
      trackLink: "Track your order",
    },
    track: {
      title: "Track your order",
      intro: "Enter your order number and the phone number used at checkout.",
      orderNumber: "Order number",
      phone: "Phone number",
      submit: "Track",
      searching: "Searching…",
      notFound: "We couldn't find an order with these details.",
      rate: "Too many attempts, please try again shortly.",
      invalid: "Please check the order number and phone.",
      status: statusEn,
      steps: { placed: "Order placed", confirmed: "Confirmed", shipped: "Out for delivery", delivered: "Delivered" },
      canceled: "This order was canceled.",
      returned: "This order was returned.",
      carrier: "Carrier",
      trackingNumber: "Tracking number",
      items: "Items",
      total: "Total",
      deliveryFee: "Delivery",
      discount: "Discount",
      subtotal: "Subtotal",
      home: "Home",
      stopdesk: "Stop desk",
      help: "Questions? Contact us.",
      another: "Track another order",
    },
    pages: {
      faqTitle: "FAQ",
      shippingTitle: "Shipping & fees",
      shippingIntro: "We deliver to every wilaya with cash on delivery. Fees by wilaya:",
      wilaya: "Wilaya",
      home: "Home",
      stopdesk: "Stop desk",
      freeOver: "Free delivery on orders from {amount}",
      notAvailable: "Unavailable",
      deliveryDays: "Usual delivery time: {min}–{max} days.",
      contactTitle: "Contact us",
      contactIntro: "We're here to help. Send us a message and we'll reply soon.",
      call: "Call",
      whatsapp: "WhatsApp",
      email: "Email",
    },
    forms: {
      name: "Name",
      phone: "Phone",
      email: "Email",
      message: "Your message",
      send: "Send",
      sending: "Sending…",
      sent: "Thank you! We received your message.",
      error: "Couldn't send, please try again.",
      rate: "Too many messages sent, try again later.",
      invalid: "Please check the fields (phone or email required).",
      newsletterTitle: "Newsletter",
      newsletterText: "Be the first to hear about new arrivals and offers.",
      newsletterConsent: "I agree to receive marketing emails from NONA",
      subscribe: "Subscribe",
      subscribed: "You're subscribed 💕",
    },
    product: {
      details: "Details",
      material: "Material",
      care: "Care",
      fit: "Fit & sizing",
      sizeGuide: "Size guide",
      model: "Model info",
      related: "You may also like",
    },
    reviews: {
      title: "Customer reviews",
      leave: "Leave a review",
      name: "Name",
      rating: "Rating",
      body: "Your review (optional)",
      submit: "Send review",
      sending: "Sending…",
      thanks: "Thank you! Your review will appear after moderation 💕",
      error: "Couldn't send, please try again.",
      rate: "Too many reviews sent, try again later.",
      invalid: "Enter your name and pick a rating.",
      count: "{count} reviews",
      close: "Close",
    },
    landing: {
      previewOnly: "This is a draft preview — ordering is disabled until it's published.",
      draftBanner: "Draft preview — not published",
    },
  },
};
