import { revalidatePath } from "next/cache";
import { locales } from "@/i18n/config";

/**
 * Revalidate storefront pages across all locales after an admin write.
 * Pairs with `updateTag(...)` (which busts the cached data) to force the
 * static/ISR pages to re-render with fresh content immediately.
 */
export function revalidateStore(slug?: string) {
  for (const l of locales) {
    revalidatePath(`/${l}`);
    revalidatePath(`/${l}/shop`);
    if (slug) revalidatePath(`/${l}/product/${slug}`);
  }
}
