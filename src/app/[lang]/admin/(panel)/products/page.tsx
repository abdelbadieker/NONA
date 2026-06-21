import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { adminText } from "@/i18n/admin";
import { getAdminProducts } from "@/lib/data/admin";
import { ProductRowActions } from "@/components/admin/ProductRowActions";
import { cn, formatPrice, pickLocale } from "@/lib/utils";

export default async function AdminProductsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const t = adminText[lang];
  const currency = lang === "ar" ? "دج" : "DA";
  const products = await getAdminProducts();
  const base = `/${lang}/admin/products`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">{t.products.title}</h1>
        <Link
          href={`${base}/new`}
          className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="size-4" aria-hidden />
          {t.products.add}
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {products.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted">
            {t.products.empty}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {products.map((p) => (
              <li
                key={p.id}
                className={cn(
                  "flex items-center gap-3 p-3",
                  !p.is_active && "opacity-60",
                )}
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-blush-light">
                  {p.image && (
                    <Image
                      src={p.image}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {pickLocale(p, "name", lang)}
                    {!p.is_active && (
                      <span className="ms-2 text-xs text-muted">
                        ({t.products.hidden})
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {formatPrice(p.price)} {currency} · {t.products.stock}:{" "}
                    {p.total_stock}
                  </p>
                </div>
                <ProductRowActions
                  id={p.id}
                  isActive={p.is_active}
                  lang={lang}
                  editHref={`${base}/${p.id}`}
                  deleteConfirm={t.products.deleteConfirm}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
