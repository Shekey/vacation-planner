import { db } from "@/lib/db";

export const AUDIT_ACTIONS = [
  "member.removed",
  "member.restored",
  "member.role_changed",
  "member.added_without_email",
  "member.email_added",
  "booking.cancelled",
  "booking.restored",
  "booking.approved",
  "booking.declined",
  "booking.vacation_returned",
  "booking.auto_approved",
  "workspace.deleted",
  "workspace.restored",
  "import.people",
  "import.timeoff",
  // Support access: granted and revoked by a workspace admin, the rest by the operator's team.
  "support.access_granted",
  "support.access_revoked",
  "support.access_used",
  "support.trial_extended",
  "support.workspace_restored",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** "2026-11-02/2026-11-04" for a booking's `detail`. */
export function bookingDetail(b: { start: string; end: string }): string {
  return `${b.start}/${b.end}`;
}

/** Splits a booking `detail` back into its dates, or null when it isn't one. */
export function parseBookingDetail(detail: string | null): { start: string; end: string } | null {
  const m = detail?.match(/^(\d{4}-\d{2}-\d{2})\/(\d{4}-\d{2}-\d{2})$/);
  return m ? { start: m[1], end: m[2] } : null;
}

/**
 * Writes one audit event. A failure is logged and never blocks the action that caused it, since
 * the person has already seen the thing they asked for happen.
 */
export async function recordAudit(event: {
  workspaceId: string;
  actorId: string | null;
  action: AuditAction;
  /** Who it was about, by name or email. */
  targetLabel?: string | null;
  detail?: string | null;
}) {
  try {
    await db.auditEvent.create({
      data: {
        workspaceId: event.workspaceId,
        actorId: event.actorId,
        action: event.action,
        targetLabel: event.targetLabel ?? null,
        detail: event.detail ?? null,
      },
    });
  } catch (e) {
    console.error("[audit] could not record", event.action, e);
  }
}
