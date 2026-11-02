"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, CopyPlus, ExternalLink, Trash2 } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { AdminBuilderText } from "@/i18n/admin-builder";
import { deleteLanding, duplicateLanding } from "@/lib/actions/landing";
import { useAdminAction } from "./use-action";

export function LandingRowActions({
  id,
  link,
  published,
  lang,
  t,
}: {
  id: string;
  link: string;
  published: boolean;
  lang: Locale;
  t: AdminBuilderText["landing"];
}) {
  const router = useRouter();
  const { pending, run } = useAdminAction(t.errors, t.saved);
  const [copied, setCopied] = useState(false);
  const btn = "grid size-9 place-items-center rounded-lg hover:bg-cream disabled:opacity-40";
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(link).then(() => (setCopied(true), setTimeout(() => setCopied(false), 1500)))}
        className={btn}
        aria-label={t.copyLink}
        title={copied ? t.copied : t.copyLink}
      >
        <Copy className={copied ? "size-4 text-green-600" : "size-4"} aria-hidden />
      </button>
      {published && (
        <a href={link} target="_blank" rel="noopener noreferrer" className={btn} aria-label={t.open} title={t.open}>
          <ExternalLink className="size-4" aria-hidden />
        </a>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => duplicateLanding(id, lang), (r) => "id" in r && router.push(`/${lang}/admin/landing/${r.id}`))}
        className={btn}
        aria-label={t.duplicate}
        title={t.duplicate}
      >
        <CopyPlus className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => confirm(t.deleteConfirm) && run(() => deleteLanding(id, lang))}
        className={`${btn} text-red-600 hover:bg-red-50`}
        aria-label={t.delete}
        title={t.delete}
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  );
}
