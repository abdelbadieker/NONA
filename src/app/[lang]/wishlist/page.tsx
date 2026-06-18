import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { WishlistView } from "@/components/wishlist/WishlistView";

export default async function WishlistPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold text-ink">{dict.nav.wishlist}</h1>
      <div className="mt-6">
        <WishlistView lang={lang} dict={dict} />
      </div>
    </div>
  );
}
