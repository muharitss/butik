export type Role = "owner" | "staff";

export const PERMISSIONS = {
  // Owner-only sensitive permissions
  "customers:delete": ["owner"],
  "garments:manage": ["owner"],
  "audit:view": ["owner"],
  "users:manage": ["owner"],
  "settings:manage": ["owner"],
  "reports:view": ["owner"],
  "materials:manage": ["owner"],

  // Staff-accessible permissions (both owner and staff)
  "customers:read": ["owner", "staff"],
  "customers:create": ["owner", "staff"],
  "customers:update": ["owner", "staff"],
  "orders:read": ["owner", "staff"],
  "orders:create": ["owner", "staff"],
  "orders:update": ["owner", "staff"],
  "payments:record": ["owner", "staff"],
  "fittings:record": ["owner", "staff"],
  "revisions:record": ["owner", "staff"],
  "attachments:upload": ["owner", "staff"]
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(
  role: string | null | undefined,
  permission: Permission | string
): boolean {
  if (!role) return false;
  const allowed = PERMISSIONS[permission as Permission];
  return allowed ? (allowed as readonly string[]).includes(role) : false;
}
