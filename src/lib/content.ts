import type { Locale } from "@/i18n/config";

export const reviews: Record<
  Locale,
  { name: string; text: string; rating: number }[]
> = {
  ar: [
    { name: "أمينة", text: "جودة ممتازة والتوصيل كان سريع. سأطلب مرة أخرى أكيد!", rating: 5 },
    { name: "سارة", text: "المقاس مظبوط والقماش راقي. شكراً نونة 💕", rating: 5 },
    { name: "ياسمين", text: "خدمة محترمة وتأكيد الطلب بالهاتف طمّنني. أنصح بها.", rating: 5 },
  ],
  fr: [
    { name: "Amina", text: "Excellente qualité et livraison rapide. Je recommande !", rating: 5 },
    { name: "Sarah", text: "La taille est parfaite et le tissu élégant. Merci NONA 💕", rating: 5 },
    { name: "Yasmine", text: "Service sérieux, la confirmation par téléphone m'a rassurée.", rating: 5 },
  ],
  en: [
    { name: "Amina", text: "Great quality and fast delivery. Will definitely order again!", rating: 5 },
    { name: "Sarah", text: "Perfect fit and elegant fabric. Thank you NONA 💕", rating: 5 },
    { name: "Yasmine", text: "Serious service — the phone confirmation reassured me.", rating: 5 },
  ],
};

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
