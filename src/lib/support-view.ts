import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";

const WINDOW_MS = 15 * 60_000;

/**
 * Logs that the operator looked at a workspace during support access, at most once per 15 minutes
 * per person, so reloading the page doesn't flood the customer's activity log.
 */
export async function logSupportAccess(workspaceId: string, operatorId: string) {
  const recent = await db.auditEvent.findFirst({
    where: {
      workspaceId,
      actorId: operatorId,
      action: "support.access_used",
      createdAt: { gt: new Date(Date.now() - WINDOW_MS) },
    },
    select: { id: true },
  });
  if (!recent) await recordAudit({ workspaceId, actorId: operatorId, action: "support.access_used" });
}

/** Members and booking counts only: no dates, no webhook URLs, no calendar feed tokens. */
export async function loadSupportView(workspaceId: string) {
  const [members, counts] = await Promise.all([
    db.membership.findMany({
      where: { workspaceId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { joinedAt: "asc" },
      take: 200,
    }),
    db.booking.groupBy({ by: ["status"], where: { workspaceId }, _count: true }),
  ]);
  return { members, bookings: counts.map((c) => [c.status, c._count] as const) };
}
