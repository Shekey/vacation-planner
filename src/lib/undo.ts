/** How long deleted workspaces, removed people and cancelled bookings can be restored. */
export const RESTORE_DAYS = 30;

/** How long audit events are kept. */
export const AUDIT_RETENTION_MONTHS = 12;

const DAY = 86_400_000;

/** The moment up to which something that happened at `at` can still be restored. */
export function restorableUntil(at: Date): Date {
  return new Date(at.getTime() + RESTORE_DAYS * DAY);
}

/** True while `at` (when it was deleted, removed or cancelled) is less than RESTORE_DAYS ago; false when unknown. */
export function canRestore(at: Date | null | undefined, now = new Date()): boolean {
  return at != null && restorableUntil(at) > now;
}

/** Whole days left to restore, at least 1 while it's still possible. */
export function restoreDaysLeft(at: Date, now = new Date()): number {
  return Math.max(0, Math.ceil((restorableUntil(at).getTime() - now.getTime()) / DAY));
}

/** Everything that happened before this is past its window: what the monthly purge deletes. */
export function restoreCutoff(now = new Date()): Date {
  return new Date(now.getTime() - RESTORE_DAYS * DAY);
}

export function auditCutoff(now = new Date()): Date {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() - AUDIT_RETENTION_MONTHS);
  return d;
}

/** Why a booking was cancelled, when it wasn't the person or an admin cancelling it. */
export const MEMBER_REMOVED = "MEMBER_REMOVED";
