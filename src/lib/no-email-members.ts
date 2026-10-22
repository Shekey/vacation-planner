import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { hasNoEmail, noEmailAddress } from "@/lib/no-email";

/** Adds someone by name as a member. The caller checks the plan limit. */
export async function addWithoutEmail(
  workspace: { id: string },
  actorId: string,
  person: { name: string; annualAllowanceDays: number | null },
) {
  const membership = await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email: noEmailAddress(), name: person.name } });
    return tx.membership.create({
      data: { workspaceId: workspace.id, userId: user.id, annualAllowanceDays: person.annualAllowanceDays },
    });
  });
  await recordAudit({ workspaceId: workspace.id, actorId, action: "member.added_without_email", targetLabel: person.name });
  return membership;
}

export type AttachResult = { ok: true } | { error: "inUse" };

/**
 * Gives someone added without email their real address. If that address already has an account (they use the app
 * in another team), the membership moves to that account and the placeholder is deleted; their bookings stay.
 */
export async function attachEmail(
  member: { id: string; workspaceId: string; userId: string },
  email: string,
  actorId: string,
): Promise<AttachResult> {
  const placeholder = await db.user.findUniqueOrThrow({ where: { id: member.userId }, select: { email: true, name: true } });
  if (!hasNoEmail(placeholder.email)) return { ok: true };
  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, memberships: { where: { workspaceId: member.workspaceId }, select: { id: true } } },
  });
  if (existing && existing.memberships.length > 0) return { error: "inUse" };

  await db.$transaction(async (tx) => {
    if (!existing) {
      await tx.user.update({ where: { id: member.userId }, data: { email } });
      return;
    }
    await tx.membership.update({ where: { id: member.id }, data: { userId: existing.id } });
    if (!existing.name && placeholder.name) await tx.user.update({ where: { id: existing.id }, data: { name: placeholder.name } });
    await tx.user.delete({ where: { id: member.userId } });
  });
  await recordAudit({ workspaceId: member.workspaceId, actorId, action: "member.email_added", targetLabel: placeholder.name ?? email });
  return { ok: true };
}
