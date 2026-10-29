"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Res = { ok: boolean; error?: string };

/**
 * Runs a Server Action with pending state, refreshes the page on success and
 * keeps a localized status message. `errors` maps error codes to text.
 */
export function useAdminAction(errors: Record<string, string>, savedText: string) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function run<T extends Res>(fn: () => Promise<T>, onOk?: (r: T) => void) {
    setMsg(null);
    start(async () => {
      try {
        const r = await fn();
        if (r.ok) {
          setMsg({ ok: true, text: savedText });
          onOk?.(r);
          router.refresh();
        } else {
          const code = String(r.error ?? "generic");
          setMsg({ ok: false, text: errors[code] ?? errors[code.split(":")[0]] ?? errors.generic ?? code });
        }
      } catch {
        setMsg({ ok: false, text: errors.generic ?? "Error" });
      }
    });
  }

  return { pending, run, msg, setMsg };
}

export function ActionMessage({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-sm text-green-700" : "text-sm text-red-600"}>
      {msg.text}
    </p>
  );
}
