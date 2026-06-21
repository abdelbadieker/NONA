import { MessageCircle } from "lucide-react";

export function WhatsAppButton({ phone }: { phone: string }) {
  if (!phone) return null;
  let num = phone.replace(/\D/g, "");
  if (num.startsWith("0")) num = `213${num.slice(1)}`;
  else if (!num.startsWith("213")) num = `213${num}`;

  return (
    <a
      href={`https://wa.me/${num}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      className="fixed bottom-20 end-4 z-40 grid size-12 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 md:bottom-6"
    >
      <MessageCircle className="size-6" aria-hidden />
    </a>
  );
}
