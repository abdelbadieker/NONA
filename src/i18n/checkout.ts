import type { Locale } from "./config";

export type CheckoutText = {
  title: string;
  contactInfo: string;
  deliveryInfo: string;
  fullName: string;
  fullNamePlaceholder: string;
  phone: string;
  phonePlaceholder: string;
  phone2: string;
  wilaya: string;
  selectWilaya: string;
  commune: string;
  communePlaceholder: string;
  address: string;
  addressPlaceholder: string;
  deliveryType: string;
  home: string;
  stopdesk: string;
  notes: string;
  notesPlaceholder: string;
  orderSummary: string;
  quantity: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  placeOrder: string;
  submitting: string;
  confirmTitle: string;
  confirmText: string;
  confirmYes: string;
  confirmEdit: string;
  errName: string;
  errPhone: string;
  errAddress: string;
  errWilaya: string;
  errStock: string;
  errGeneric: string;
  emptyTitle: string;
  emptyText: string;
  goShop: string;
  successTitle: string;
  successText: string;
  orderNumber: string;
  successNote: string;
  continue: string;
};

export const checkoutText: Record<Locale, CheckoutText> = {
  ar: {
    title: "إتمام الطلب",
    contactInfo: "معلومات التواصل",
    deliveryInfo: "معلومات التوصيل",
    fullName: "الاسم الكامل",
    fullNamePlaceholder: "مثال: أمينة بن علي",
    phone: "رقم الهاتف",
    phonePlaceholder: "06 00 00 00 00",
    phone2: "رقم هاتف إضافي (اختياري)",
    wilaya: "الولاية",
    selectWilaya: "اختاري الولاية",
    commune: "البلدية (اختياري)",
    communePlaceholder: "اسم البلدية",
    address: "العنوان الكامل",
    addressPlaceholder: "الحي، الشارع، رقم المنزل…",
    deliveryType: "نوع التوصيل",
    home: "التوصيل إلى المنزل",
    stopdesk: "التوصيل إلى المكتب",
    notes: "ملاحظات (اختياري)",
    notesPlaceholder: "أي تفاصيل إضافية…",
    orderSummary: "ملخص الطلب",
    quantity: "الكمية",
    subtotal: "المجموع الفرعي",
    deliveryFee: "رسوم التوصيل",
    total: "المجموع الكلي",
    placeOrder: "تأكيد الطلب",
    submitting: "جارٍ الإرسال…",
    confirmTitle: "هل البيانات صحيحة؟",
    confirmText: "تأكدي من رقم الهاتف والعنوان قبل تأكيد الطلب.",
    confirmYes: "نعم، أكّدي الطلب",
    confirmEdit: "تعديل",
    errName: "الرجاء إدخال اسم صحيح",
    errPhone: "رقم هاتف غير صحيح (مثال: 0600000000)",
    errAddress: "الرجاء إدخال عنوان كامل",
    errWilaya: "الرجاء اختيار الولاية",
    errStock: "الكمية المطلوبة غير متوفرة حالياً",
    errGeneric: "تعذّر إرسال الطلب، حاولي مرة أخرى",
    emptyTitle: "لا يوجد منتج في الطلب",
    emptyText: "اختاري منتجاً ثم اضغطي «اطلبيه الآن».",
    goShop: "تصفّحي المتجر",
    successTitle: "تم استلام طلبك!",
    successText: "شكراً لك 💕 سنتواصل معك هاتفياً لتأكيد الطلب.",
    orderNumber: "رقم الطلب",
    successNote: "يرجى إبقاء هاتفك متاحاً لتأكيد الطلب والعنوان.",
    continue: "مواصلة التسوق",
  },
  fr: {
    title: "Finaliser la commande",
    contactInfo: "Coordonnées",
    deliveryInfo: "Informations de livraison",
    fullName: "Nom complet",
    fullNamePlaceholder: "ex : Amina Ben Ali",
    phone: "Numéro de téléphone",
    phonePlaceholder: "06 00 00 00 00",
    phone2: "Téléphone supplémentaire (optionnel)",
    wilaya: "Wilaya",
    selectWilaya: "Choisir la wilaya",
    commune: "Commune (optionnel)",
    communePlaceholder: "Nom de la commune",
    address: "Adresse complète",
    addressPlaceholder: "Quartier, rue, numéro…",
    deliveryType: "Type de livraison",
    home: "Livraison à domicile",
    stopdesk: "Livraison au bureau (stop desk)",
    notes: "Remarques (optionnel)",
    notesPlaceholder: "Détails supplémentaires…",
    orderSummary: "Résumé de la commande",
    quantity: "Quantité",
    subtotal: "Sous-total",
    deliveryFee: "Frais de livraison",
    total: "Total",
    placeOrder: "Confirmer la commande",
    submitting: "Envoi…",
    confirmTitle: "Les informations sont-elles correctes ?",
    confirmText: "Vérifiez votre téléphone et votre adresse avant de confirmer.",
    confirmYes: "Oui, confirmer",
    confirmEdit: "Modifier",
    errName: "Veuillez saisir un nom valide",
    errPhone: "Numéro invalide (ex : 0600000000)",
    errAddress: "Veuillez saisir une adresse complète",
    errWilaya: "Veuillez choisir la wilaya",
    errStock: "Quantité demandée indisponible",
    errGeneric: "Échec de l'envoi, veuillez réessayer",
    emptyTitle: "Aucun produit dans la commande",
    emptyText: "Choisissez un produit puis cliquez sur « Commander ».",
    goShop: "Parcourir la boutique",
    successTitle: "Commande reçue !",
    successText: "Merci 💕 Nous vous appellerons pour confirmer la commande.",
    orderNumber: "Numéro de commande",
    successNote: "Gardez votre téléphone disponible pour la confirmation.",
    continue: "Continuer les achats",
  },
  en: {
    title: "Checkout",
    contactInfo: "Contact details",
    deliveryInfo: "Delivery details",
    fullName: "Full name",
    fullNamePlaceholder: "e.g. Amina Ben Ali",
    phone: "Phone number",
    phonePlaceholder: "06 00 00 00 00",
    phone2: "Extra phone (optional)",
    wilaya: "Wilaya",
    selectWilaya: "Choose wilaya",
    commune: "Commune (optional)",
    communePlaceholder: "Commune name",
    address: "Full address",
    addressPlaceholder: "Neighborhood, street, house no…",
    deliveryType: "Delivery type",
    home: "Home delivery",
    stopdesk: "Stop desk (office) pickup",
    notes: "Notes (optional)",
    notesPlaceholder: "Any extra details…",
    orderSummary: "Order summary",
    quantity: "Quantity",
    subtotal: "Subtotal",
    deliveryFee: "Delivery fee",
    total: "Total",
    placeOrder: "Confirm order",
    submitting: "Sending…",
    confirmTitle: "Is your information correct?",
    confirmText: "Please check your phone number and address before confirming.",
    confirmYes: "Yes, confirm",
    confirmEdit: "Edit",
    errName: "Please enter a valid name",
    errPhone: "Invalid number (e.g. 0600000000)",
    errAddress: "Please enter a full address",
    errWilaya: "Please choose a wilaya",
    errStock: "Requested quantity is unavailable",
    errGeneric: "Could not place the order, please try again",
    emptyTitle: "No product in the order",
    emptyText: "Pick a product then tap “Order now”.",
    goShop: "Browse the shop",
    successTitle: "Order received!",
    successText: "Thank you 💕 We'll call you to confirm your order.",
    orderNumber: "Order number",
    successNote: "Please keep your phone available to confirm the order.",
    continue: "Continue shopping",
  },
};
