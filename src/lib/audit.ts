import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Staff } from "@/lib/auth";

const SENSITIVE = /token|secret|password|key|authorization/i;

/** Drop anything that looks like a credential before it reaches the log. */
export function redact(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE.test(k)) out[k] = v ? "[redacted]" : v;
    else if (v && typeof v === "object" && !Array.isArray(v))
      out[k] = redact(v as Record<string, unknown>);
    else out[k] = v;
  }
  return out;
}

/**
 * Append an audit-log entry. Best-effort: a logging failure never breaks the
 * operation it describes (it is reported to the server log instead).
 */
export async function audit(
  staff: Pick<Staff, "id" | "email"> | null,
  action: string,
  resourceType: string,
  resourceId: string | null,
  metadata: Record<string, unknown> = {},
  status: "success" | "failure" = "success",
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("audit_logs").insert({
      actor_id: staff?.id ?? null,
      actor_email: staff?.email ?? null,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      status,
      metadata: redact(metadata),
    });
    if (error) console.error("[audit] insert failed", action, error.message);
  } catch (err) {
    console.error("[audit] unexpected", action, err);
  }
}
