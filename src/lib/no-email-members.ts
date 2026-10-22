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

export type AttachResult = { ok: true } | { error: "inUse" } | { invite: true };

/**
 * Gives someone added without email their real address. If that address already has an account (they use the app
 * in another team), nothing moves yet: the caller sends an invitation, and accepting it moves the membership with
 * its bookings onto that account (`acceptInvitation`). Nobody joins a workspace without saying yes.
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
    select: { memberships: { where: { workspaceId: member.workspaceId, removedAt: null }, select: { id: true } } },
  });
  if (existing && existing.memberships.length > 0) return { error: "inUse" };
  if (existing) return { invite: true };

  await db.user.update({ where: { id: member.userId }, data: { email } });
  await recordAudit({ workspaceId: member.workspaceId, actorId, action: "member.email_added", targetLabel: placeholder.name ?? email });
  return { ok: true };
}
