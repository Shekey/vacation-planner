export type Role = "ADMIN" | "MEMBER";

export type Action =
  | "members:manage" // invite, remove, change roles and allowances
  | "settings:manage" // workspace name, timezone, feature flags
  | "bookings:manage-all" // create or cancel bookings for anyone
  | "bookings:decide"; // approve or reject when approvals are enabled

const adminOnly: ReadonlySet<Action> = new Set<Action>([
  "members:manage",
  "settings:manage",
  "bookings:manage-all",
  "bookings:decide",
]);

export function can(role: Role, action: Action): boolean {
  if (role === "ADMIN") return true;
  return !adminOnly.has(action);
}
