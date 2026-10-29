// Staff permissions (client-safe). The authoritative check lives in the
// database (private.has_permission) and in every Server Action; UI checks
// only decide what to show.

export const PERMISSIONS = [
  "dashboard.view",
  "orders.view",
  "orders.manage",
  "orders.export",
  "orders.refund",
  "products.view",
  "products.manage",
  "inventory.view",
  "inventory.adjust",
  "customers.view",
  "customers.manage",
  "customers.export",
  "discounts.manage",
  "content.manage",
  "marketing.manage",
  "forms.view",
  "reports.view",
  "settings.manage",
  "staff.manage",
  "audit.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

/** True if a permission list grants `perm` ('*' grants everything). */
export function can(perms: readonly string[] | null | undefined, perm: Permission): boolean {
  if (!perms) return false;
  return perms.includes("*") || perms.includes(perm);
}
