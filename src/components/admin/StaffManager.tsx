"use client";

import { useState } from "react";
import { locales, type Locale } from "@/i18n/config";
import type { AdminOpsText } from "@/i18n/admin-ops";
import { PERMISSIONS } from "@/lib/permissions";
import { addStaffMember, saveRole, updateStaffMember } from "@/lib/actions/staff";
import { cn, pickLocale } from "@/lib/utils";
import { ActionMessage, useAdminAction } from "./use-action";
import { Badge, btnPrimary, btnSecondary, inputCls, labelCls } from "./ui";

type Role = { key: string; name_ar: string; name_fr: string | null; name_en: string | null; permissions: string[]; is_system: boolean };
type Member = { id: string; email: string | null; full_name: string | null; role_key: string; is_active: boolean };

function MemberRow({ m, roles, lang, ops, isSelf }: { m: Member; roles: Role[]; lang: Locale; ops: AdminOpsText; isSelf: boolean }) {
  const { pending, run, msg } = useAdminAction(ops.errors, ops.common.saved);
  const [role, setRole] = useState(m.role_key);
  const [active, setActive] = useState(m.is_active);
  const changed = role !== m.role_key || active !== m.is_active;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">
          {m.full_name || m.email}
          {isSelf && <span className="ms-2 text-xs text-muted">({ops.staff.you})</span>}
        </p>
        <p className="text-xs text-muted" dir="ltr">
          {m.email}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={role} onChange={(e) => setRole(e.target.value)} aria-label={ops.staff.role} className={cn(inputCls, "w-auto")}>
          {roles.map((r) => (
            <option key={r.key} value={r.key}>
              {pickLocale(r, "name", lang)}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-ink">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-blush-dark" />
          {ops.staff.active}
        </label>
        <button
          type="button"
          disabled={pending || !changed}
          onClick={() => run(() => updateStaffMember({ id: m.id, roleKey: role, isActive: active, fullName: m.full_name ?? "" }, lang))}
          className={btnSecondary}
        >
          {ops.common.save}
        </button>
        <ActionMessage msg={msg} />
      </div>
    </li>
  );
}

export function StaffManager({
  lang,
  ops,
  staff,
  roles,
  selfId,
}: {
  lang: Locale;
  ops: AdminOpsText;
  staff: Member[];
  roles: Role[];
  selfId: string;
}) {
  const t = ops.staff;
  const add = useAdminAction(ops.errors, ops.common.saved);
  const roleAction = useAdminAction(ops.errors, ops.common.saved);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [newRole, setNewRole] = useState("support");
  const [rk, setRk] = useState({ key: "", ar: "", fr: "", en: "", perms: [] as string[] });

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-line bg-white">
        <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">{t.members}</h2>
        <ul className="divide-y divide-line">
          {staff.map((m) => (
            <MemberRow key={m.id} m={m} roles={roles} lang={lang} ops={ops} isSelf={m.id === selfId} />
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add.run(() => addStaffMember({ email, fullName: name, roleKey: newRole }, lang), () => {
              setEmail("");
              setName("");
            });
          }}
          className="grid gap-2 border-t border-line bg-cream p-4 sm:grid-cols-4"
        >
          <p className="text-sm font-semibold text-ink sm:col-span-4">{t.addMember}</p>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required dir="ltr" placeholder={t.email} aria-label={t.email} className={inputCls} />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.name} aria-label={t.name} className={inputCls} />
          <select value={newRole} onChange={(e) => setNewRole(e.target.value)} aria-label={t.role} className={inputCls}>
            {roles.map((r) => (
              <option key={r.key} value={r.key}>
                {pickLocale(r, "name", lang)}
              </option>
            ))}
          </select>
          <button type="submit" disabled={add.pending} className={btnPrimary}>
            {ops.common.add}
          </button>
          <p className="text-xs text-muted sm:col-span-4">{t.addHint}</p>
          <div className="sm:col-span-4">
            <ActionMessage msg={add.msg} />
          </div>
        </form>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-line bg-white">
        <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">{t.roles}</h2>
        <table className="w-full min-w-[48rem] text-xs">
          <thead className="bg-cream text-muted">
            <tr>
              <th className="sticky start-0 bg-cream p-2 text-start font-medium">{t.permissions}</th>
              {roles.map((r) => (
                <th key={r.key} className="p-2 font-medium">
                  {pickLocale(r, "name", lang)}
                  {r.is_system && (
                    <span className="block">
                      <Badge>{t.system}</Badge>
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {PERMISSIONS.map((p) => (
              <tr key={p}>
                <td className="sticky start-0 bg-white p-2 font-mono text-ink" dir="ltr">
                  {p}
                </td>
                {roles.map((r) => {
                  const has = r.permissions.includes("*") || r.permissions.includes(p);
                  return (
                    <td key={r.key} className={cn("p-2 text-center", has ? "text-green-700" : "text-line")}>
                      {has ? "✓" : "·"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          roleAction.run(() => saveRole({ key: rk.key, name_ar: rk.ar, name_fr: rk.fr || null, name_en: rk.en || null, permissions: rk.perms }, lang));
        }}
        className="space-y-3 rounded-2xl border border-line bg-white p-4"
      >
        <h2 className="text-sm font-semibold text-ink">{t.newRole}</h2>
        <div className="grid gap-2 sm:grid-cols-4">
          <label>
            <span className={labelCls}>{t.roleKey}</span>
            <input value={rk.key} onChange={(e) => setRk({ ...rk, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} dir="ltr" required className={inputCls} placeholder="call_center" />
          </label>
          {locales.map((l) => (
            <label key={l}>
              <span className={labelCls}>{t.name} ({l})</span>
              <input value={rk[l]} onChange={(e) => setRk({ ...rk, [l]: e.target.value })} required={l === "ar"} className={inputCls} />
            </label>
          ))}
        </div>
        <div className="grid gap-1 sm:grid-cols-3">
          {PERMISSIONS.map((p) => (
            <label key={p} className="flex items-center gap-2 text-xs text-ink" dir="ltr">
              <input
                type="checkbox"
                checked={rk.perms.includes(p)}
                onChange={() => setRk({ ...rk, perms: rk.perms.includes(p) ? rk.perms.filter((x) => x !== p) : [...rk.perms, p] })}
                className="size-3.5 accent-blush-dark"
              />
              {p}
            </label>
          ))}
        </div>
        <button type="submit" disabled={roleAction.pending} className={btnPrimary}>
          {ops.common.save}
        </button>
        <ActionMessage msg={roleAction.msg} />
      </form>
    </div>
  );
}
