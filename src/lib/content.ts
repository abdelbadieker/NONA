import type { Locale } from "@/i18n/config";

// Customer reviews now come from the `reviews` table (moderated); the former
// hard-coded testimonials were removed because they weren't real customers.

export const faq: Record<Locale, { q: string; a: string }[]> = {
  ar: [
    { q: "كيف يتم الدفع؟", a: "الدفع عند الاستلام (نقداً) في كل ولايات الجزائر." },
    { q: "كم تستغرق مدة التوصيل؟", a: "عادةً من 2 إلى 5 أيام حسب الولاية ونوع التوصيل." },
    { q: "هل يمكنني الاستبدال؟", a: "نعم، يمكن الاستبدال خلال 3 أيام من الاستلام مع الحفاظ على المنتج." },
    { q: "هل أحتاج إلى حساب للطلب؟", a: "لا، يمكنك الطلب مباشرةً دون إنشاء حساب." },
  ],
  fr: [
    { q: "Comment se fait le paiement ?", a: "Paiement à la livraison (espèces) dans toutes les wilayas." },
    { q: "Quel est le délai de livraison ?", a: "Généralement 2 à 5 jours selon la wilaya et le mode de livraison." },
    { q: "Puis-je échanger ?", a: "Oui, l'échange est possible sous 3 jours après réception." },
    { q: "Faut-il un compte pour commander ?", a: "Non, vous pouvez commander directement sans créer de compte." },
  ],
  en: [
    { q: "How do I pay?", a: "Cash on delivery across all Algerian wilayas." },
    { q: "How long does delivery take?", a: "Usually 2 to 5 days depending on the wilaya and delivery type." },
    { q: "Can I exchange?", a: "Yes, exchange is possible within 3 days of receipt." },
    { q: "Do I need an account to order?", a: "No, you can order directly without creating an account." },
  ],
};
