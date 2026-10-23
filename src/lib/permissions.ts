/**
 * Roles in a workspace (#77). Admin is everything. Approver is the head nurse, shift lead or foreman: decides
 * requests and books for others, but can't change settings, members or billing. Member books their own time off.
 * Viewer only looks at the calendar, e.g. a front desk that needs to know who is in.
 */
export type Role = "ADMIN" | "APPROVER" | "MEMBER" | "VIEWER";

export const ROLES: readonly Role[] = ["ADMIN", "APPROVER", "MEMBER", "VIEWER"];

export type Action =
  | "members:manage" // invite, remove, change roles and allowances, import
  | "settings:manage" // workspace settings, holidays, billing, support access, activity, deleting the workspace
  | "bookings:manage-all" // create, change or cancel bookings for anyone
  | "bookings:decide" // approve or decline when approvals are enabled
  | "bookings:own" // book, change and cancel one's own time off
  | "sick:see"; // see colleagues' sick days as sick and enter sick days for them (health data, Art. 9 GDPR)

const grants: Record<Role, ReadonlySet<Action>> = {
  ADMIN: new Set<Action>(["members:manage", "settings:manage", "bookings:manage-all", "bookings:decide", "bookings:own", "sick:see"]),
  APPROVER: new Set<Action>(["bookings:manage-all", "bookings:decide", "bookings:own"]),
  MEMBER: new Set<Action>(["bookings:own"]),
  VIEWER: new Set<Action>(),
};

export function can(role: Role, action: Action): boolean {
  return grants[role]?.has(action) ?? false;
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
