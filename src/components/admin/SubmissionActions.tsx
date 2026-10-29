"use client";

import type { Locale } from "@/i18n/config";
import type { AdminOpsText } from "@/i18n/admin-ops";
import { setSubmissionStatus } from "@/lib/actions/forms";
import { useAdminAction } from "./use-action";

export function SubmissionActions({ id, status, lang, ops }: { id: string; status: string; lang: Locale; ops: AdminOpsText }) {
  const { pending, run } = useAdminAction(ops.errors, ops.common.saved);
  return (
    <div className="flex gap-2">
      {status === "new" && (
        <button type="button" disabled={pending} onClick={() => run(() => setSubmissionStatus(id, "read", lang))} className="text-xs font-medium text-blush-dark hover:underline">
          {ops.forms.markRead}
        </button>
      )}
      {status !== "archived" && (
        <button type="button" disabled={pending} onClick={() => run(() => setSubmissionStatus(id, "archived", lang))} className="text-xs text-muted hover:underline">
          {ops.forms.archive}
        </button>
      )}
    </div>
  );
}
