import { notFound } from "next/navigation";
import { CheckCircle2, CircleDashed, Hand } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { adminOpsText } from "@/i18n/admin-ops";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getHealth } from "@/lib/data/admin-ops";
import { getMarketingAdmin } from "@/lib/data/marketing";
import { Badge, Card, NoAccess, PageHeader, fmtDate } from "@/components/admin/ui";

type State = "configured" | "notConfigured" | "manual";

/**
 * Honest integration status: "configured" means credentials are present —
 * NOT that events were verified on the provider side.
 */
export default async function IntegrationsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const ops = adminOpsText[lang];
  const t = ops.integrations;
  const staff = await requireStaff(lang);
  if (!can(staff.permissions, "settings.manage")) return <NoAccess t={ops.common} />;

  const [mkt, health] = await Promise.all([getMarketingAdmin(), getHealth()]);
  const aiKey = Boolean(process.env.AI_GATEWAY_API_KEY);

  const rows: { key: string; state: State; note?: string; detail?: string }[] = [
    {
      key: "meta",
      state: mkt.metaPixelId ? "configured" : "notConfigured",
      detail: mkt.metaPixelId ? `Pixel ✓ · CAPI ${mkt.hasCapiToken ? "✓" : "✕"}` : undefined,
    },
    { key: "tiktok", state: mkt.tiktokPixelId ? "configured" : "notConfigured" },
    { key: "ga4", state: mkt.ga4Id ? "configured" : "notConfigured" },
    { key: "payments", state: "manual", note: t.notes.payments },
    { key: "carriers", state: "manual", note: t.notes.carriers },
    { key: "sms", state: "manual", note: t.notes.sms },
    { key: "email", state: "notConfigured", note: t.notes.email },
    { key: "ai", state: aiKey ? "configured" : "notConfigured", note: aiKey ? t.notes.ai : t.notes.aiMissing },
  ];

  const icon = (s: State) =>
    s === "configured" ? (
      <CheckCircle2 className="size-5 text-green-600" aria-hidden />
    ) : s === "manual" ? (
      <Hand className="size-5 text-amber-600" aria-hidden />
    ) : (
      <CircleDashed className="size-5 text-muted" aria-hidden />
    );

  return (
    <div className="space-y-5">
      <PageHeader title={t.title} />
      <Card bodyClassName="p-0">
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.key} className="flex items-start gap-3 px-4 py-3">
              {icon(r.state)}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{t.providers[r.key]}</p>
                {r.detail && <p className="text-xs text-muted" dir="ltr">{r.detail}</p>}
                {r.note && <p className="text-xs text-muted">{r.note}</p>}
                {r.state === "configured" && ["meta", "tiktok", "ga4"].includes(r.key) && (
                  <p className="text-xs text-amber-700">{t.notVerified}</p>
                )}
              </div>
              <Badge tone={r.state === "configured" ? "green" : r.state === "manual" ? "amber" : "neutral"}>
                {r.state === "configured" ? t.configured : r.state === "manual" ? t.manual : t.notConfigured}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={`${t.database} · ${t.migrations}`} bodyClassName="p-0">
          <ul className="divide-y divide-line text-sm" dir="ltr">
            {health.migrations.map((m) => (
              <li key={m.name} className="flex items-center justify-between px-4 py-2">
                <span className="font-mono text-xs">{m.name}</span>
                <Badge tone={m.ok ? "green" : "red"}>{m.ok ? t.applied : t.missing}</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t.recentFailures} bodyClassName="p-0">
          {health.failures.length === 0 ? (
            <p className="p-4 text-sm text-muted">{t.noFailures}</p>
          ) : (
            <ul className="divide-y divide-line text-xs" dir="ltr">
              {health.failures.map((f) => (
                <li key={String(f.id)} className="px-4 py-2">
                  <span className="font-mono">{String(f.action)}</span> · {String(f.actor_email ?? "")} ·{" "}
                  <span className="text-muted">{fmtDate(String(f.created_at), true)}</span>
                  <span className="block text-muted">{JSON.stringify(f.metadata)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
