import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default async function WishlistPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <PlaceholderScreen title={dict.nav.wishlist} note={dict.home.comingSoon} />
  );
}
