import { createHash, randomBytes } from "node:crypto";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { sendEmail, type SendResult } from "@/lib/email";

const INVITE_TTL_DAYS = 7;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Pulls unique, normalized emails out of free-form text: a typed list ("a@x.com, b@y.com"), or rows pasted
 * from Excel or Outlook ("Anna Schmidt\tanna@x.com", "Ben <ben@y.com>"). Words without an @, like names, are skipped.
 */
export function parseEmailList(input: string): { valid: string[]; invalid: string[] } {
  const items = input
    .split(/[\s,;<>"'()[\]]+/)
    .map(normalizeEmail)
    .map((s) => s.replace(/^mailto:/, "").replace(/\.$/, ""))
    .filter((s) => s.includes("@"));
  const unique = [...new Set(items)];
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return { valid: unique.filter((e) => re.test(e)), invalid: unique.filter((e) => !re.test(e)) };
}

type InviteContext = {
  workspace: { id: string; name: string };
  invitedBy: { id: string; name?: string | null; email: string };
  origin: string;
};

/** Creates (or refreshes) an invitation and emails the link. */
async function issueInvitation(email: string, role: Role, ctx: InviteContext): Promise<SendResult> {
  const token = randomBytes(32).toString("base64url");
  // Only one live invitation per email and workspace.
  await db.invitation.updateMany({
    where: { workspaceId: ctx.workspace.id, email, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await db.invitation.create({
    data: {
      workspaceId: ctx.workspace.id,
      email,
      role,
      tokenHash: hashToken(token),
      invitedById: ctx.invitedBy.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  const inviter = ctx.invitedBy.name ?? ctx.invitedBy.email;
  return sendEmail({
    to: email,
    subject: `${inviter} invited you to ${ctx.workspace.name} on Vacation Planner`,
    text: `${inviter} invited you to join ${ctx.workspace.name}.\n\nAccept the invitation: ${ctx.origin}/invite/${token}\n\nThe link expires in ${INVITE_TTL_DAYS} days.`,
  });
}

export async function inviteMembers(emails: string[], role: Role, ctx: InviteContext) {
  const existing = await db.membership.findMany({
    where: { workspaceId: ctx.workspace.id, removedAt: null, user: { email: { in: emails } } },
    select: { user: { select: { email: true } } },
  });
  const members = new Set(existing.map((m) => m.user.email));
  const toInvite = emails.filter((e) => !members.has(e));
  const failed: { email: string; error: string }[] = [];
  for (const email of toInvite) {
    const sent = await issueInvitation(email, role, ctx);
    if (!sent.ok) failed.push({ email, error: sent.error });
  }
  return { invited: toInvite, alreadyMembers: [...members], failed };
}

export async function resendInvitation(invitationId: string, ctx: InviteContext): Promise<SendResult | null> {
  const invite = await db.invitation.findFirst({
    where: { id: invitationId, workspaceId: ctx.workspace.id, acceptedAt: null, revokedAt: null },
  });
  if (!invite) return null;
  return issueInvitation(invite.email, invite.role, ctx);
}

export type InvitationLookup =
  | { status: "ok"; invitation: { id: string; email: string; role: Role; workspace: { id: string; name: string; slug: string } } }
  | { status: "invalid" | "expired" | "used" | "revoked" };

export async function findInvitation(token: string): Promise<InvitationLookup> {
  const invitation = await db.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { workspace: { select: { id: true, name: true, slug: true } } },
  });
  if (!invitation) return { status: "invalid" };
  if (invitation.acceptedAt) return { status: "used" };
  if (invitation.revokedAt) return { status: "revoked" };
  if (invitation.expiresAt < new Date()) return { status: "expired" };
  return { status: "ok", invitation };
}

/** Turns an invitation into a membership for the signed-in user. Returns the workspace slug. */
export async function acceptInvitation(token: string, user: { id: string; email: string }) {
  const found = await findInvitation(token);
  if (found.status !== "ok") throw new Error(`Invitation is ${found.status}.`);
  const { invitation } = found;
  if (normalizeEmail(user.email) !== invitation.email) {
    throw new Error(`This invitation is for ${invitation.email}.`);
  }

  const settings = await db.workspaceSettings.findUnique({ where: { workspaceId: invitation.workspace.id } });
  await db.$transaction([
    db.membership.upsert({
      where: { workspaceId_userId: { workspaceId: invitation.workspace.id, userId: user.id } },
      create: {
        workspaceId: invitation.workspace.id,
        userId: user.id,
        role: invitation.role,
        annualAllowanceDays: settings?.defaultAllowanceDays ?? null,
      },
      // A removed member who is invited again comes back with the new role.
      update: { removedAt: null, role: invitation.role, joinedAt: new Date() },
    }),
    db.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } }),
  ]);
  return invitation.workspace.slug;
}
