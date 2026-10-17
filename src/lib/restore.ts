import { recordAudit } from "@/lib/audit";
import { isOverlapError } from "@/lib/bookings";
import { db } from "@/lib/db";
import { accessOf } from "@/lib/plans";
import { canRestore, MEMBER_REMOVED } from "@/lib/undo";

export type RestoreMemberResult =
  | { ok: true; bookings: number; skipped: number }
  | { ok: false; reason: "notFound" | "expired" | "limit"; max?: number };

/**
 * Brings back a person removed in the last RESTORE_DAYS, with the future bookings that were cancelled
 * when they were removed. A booking that now overlaps another is skipped and counted.
 */
export async function restoreMember(
  workspace: { id: string; plan: Parameters<typeof accessOf>[0]["plan"]; billingStatus: string | null; trialEndsAt: Date | null },
  membershipId: string,
  actorId: string,
): Promise<RestoreMemberResult> {
  const member = await db.membership.findFirst({
    where: { id: membershipId, workspaceId: workspace.id, removedAt: { not: null }, isSample: false },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!member) return { ok: false, reason: "notFound" };
  if (!canRestore(member.removedAt)) return { ok: false, reason: "expired" };

  const access = accessOf(workspace);
  const active = await db.membership.count({ where: { workspaceId: workspace.id, removedAt: null, isSample: false } });
  if (active + 1 > access.maxMembers) return { ok: false, reason: "limit", max: access.maxMembers };

  await db.membership.update({ where: { id: member.id }, data: { removedAt: null } });
  const cancelled = await db.booking.findMany({
    where: { membershipId: member.id, status: "CANCELLED", cancelReason: MEMBER_REMOVED },
  });
  let bookings = 0;
  let skipped = 0;
  for (const b of cancelled) {
    try {
      await db.booking.update({
        where: { id: b.id },
        data: { status: b.cancelledFrom ?? "APPROVED", cancelledAt: null, cancelledFrom: null, cancelReason: null },
      });
      bookings++;
    } catch (e) {
      if (!isOverlapError(e)) throw e;
      skipped++;
    }
  }
  await recordAudit({
    workspaceId: workspace.id,
    actorId,
    action: "member.restored",
    targetLabel: member.user.name ?? member.user.email,
  });
  return { ok: true, bookings, skipped };
}
