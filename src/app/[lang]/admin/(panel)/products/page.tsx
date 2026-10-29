import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Plus } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { adminText } from "@/i18n/admin";
import { adminOpsText } from "@/i18n/admin-ops";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getAllCategories, getProductsPage } from "@/lib/data/admin-ops";
import { ProductTable } from "@/components/admin/ProductTable";
import { EmptyState, NoAccess, PageHeader, Pagination, btnPrimary, btnSecondary, buildHref, inputCls } from "@/components/admin/ui";
import { cn, pickLocale } from "@/lib/utils";

export default async function AdminProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; status?: string; category?: string; page?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = adminText[lang];
  const ops = adminOpsText[lang];
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "products.view")) return <NoAccess t={ops.common} />;

  const sp = await searchParams;
  const [result, categories] = await Promise.all([
    getProductsPage({ q: sp.q, status: sp.status, category: sp.category, page: Number(sp.page) || 1 }),
    getAllCategories(),
  ]);
  const base = `/${lang}/admin/products`;
  const keep = { q: sp.q, status: sp.status, category: sp.category };
  const canManage = can(staff.permissions, "products.manage");

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.products.title}
        actions={
          <>
            <a href={buildHref("/api/admin/export/products", {})} download className={btnSecondary}>
              <Download className="size-4" aria-hidden />
              {ops.common.export}
            </a>
            {canManage && (
              <Link href={`${base}/new`} className={btnPrimary}>
                <Plus className="size-4" aria-hidden />
                {t.products.add}
              </Link>
            )}
          </>
        }
      />

      <form method="get" className="grid gap-2 rounded-2xl border border-line bg-white p-3 sm:grid-cols-4">
        <input name="q" defaultValue={sp.q ?? ""} placeholder={ops.common.search} aria-label={ops.common.search} className={cn(inputCls, "sm:col-span-2")} />
        <select name="status" defaultValue={sp.status ?? ""} aria-label={ops.products.filterStatus} className={inputCls}>
          <option value="">{ops.products.status.active} + {ops.products.status.draft}</option>
          {(["active", "draft", "archived"] as const).map((s) => (
            <option key={s} value={s}>
              {ops.products.status[s]}
            </option>
          ))}
        </select>
        <select name="category" defaultValue={sp.category ?? ""} aria-label={ops.products.filterCategory} className={inputCls}>
          <option value="">{ops.products.filterCategory}: {ops.common.all}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {pickLocale(c, "name", lang)}
            </option>
          ))}
        </select>
        <div className="flex gap-2 sm:col-span-4">
          <button type="submit" className={btnSecondary}>
            {ops.common.filter}
          </button>
          <Link href={base} className="px-2 py-2 text-sm text-muted hover:text-ink">
            {ops.common.reset}
          </Link>
        </div>
      </form>

      {result.rows.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white">
          <EmptyState text={t.products.empty} />
        </div>
      ) : (
        <ProductTable
          rows={result.rows}
          lang={lang}
          ops={ops}
          stockLabel={t.products.stock}
          canManage={canManage}
          currency={lang === "ar" ? "دج" : "DA"}
        />
      )}
      <Pagination page={result.page} pages={result.pages} total={result.total} hrefFor={(p) => buildHref(base, { ...keep, page: p })} t={ops.common} />
    </div>
  );
}
