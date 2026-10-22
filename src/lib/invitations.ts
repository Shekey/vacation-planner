import { createHash, randomBytes } from "node:crypto";
import type { Role } from "@/generated/prisma/enums";
import { mapLimit, SEND_CONCURRENCY } from "@/lib/background";
import { db } from "@/lib/db";
import { sendEmail, type SendResult } from "@/lib/email";
import { messagesFor } from "@/lib/i18n";
import { getLocale, getMessages, localeOfEmail } from "@/lib/i18n/server";
import { assertColdMailRoom, recordColdMail } from "@/lib/mail-limits";
import { hasNoEmail } from "@/lib/no-email";
import { isSampleEmail } from "@/lib/sample-team";

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
  // Sample people's placeholder addresses can't receive anything, so they can't be invited either.
  const ok = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !isSampleEmail(e);
  return { valid: unique.filter(ok), invalid: unique.filter((e) => !ok(e)) };
}

type InviteContext = {
  workspace: { id: string; name: string };
  invitedBy: { id: string; name?: string | null; email: string };
  origin: string;
};

/**
 * Creates (or refreshes) an invitation and emails the link. A refreshed invitation keeps the placeholder member
 * the previous one was for, so inviting the same address again still brings their bookings along.
 */
async function issueInvitation(email: string, role: Role, ctx: InviteContext, membershipId?: string): Promise<SendResult> {
  const token = randomBytes(32).toString("base64url");
  if (!membershipId) {
    const previous = await db.invitation.findFirst({
      where: { workspaceId: ctx.workspace.id, email, acceptedAt: null, revokedAt: null, membershipId: { not: null } },
      select: { membershipId: true },
    });
    membershipId = previous?.membershipId ?? undefined;
  }
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
      membershipId,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  const inviter = ctx.invitedBy.name ?? ctx.invitedBy.email;
  // Someone who already uses the app gets their language; a newcomer gets the inviting admin's.
  const t = messagesFor((await localeOfEmail(email)) ?? (await getLocale())).email.invite;
  return sendEmail({
    to: email,
    subject: t.subject(inviter, ctx.workspace.name),
    text: t.text(inviter, ctx.workspace.name, `${ctx.origin}/invite/${token}`, INVITE_TTL_DAYS),
  });
}

export async function inviteMembers(emails: string[], role: Role, ctx: InviteContext) {
  const existing = await db.membership.findMany({
    where: { workspaceId: ctx.workspace.id, removedAt: null, user: { email: { in: emails } } },
    select: { user: { select: { email: true } } },
  });
  const members = new Set(existing.map((m) => m.user.email));
  const toInvite = emails.filter((e) => !members.has(e));
  await assertColdMailRoom(ctx.workspace.id, toInvite.length);
  // A few at a time: 50 invitations one after another can run past the function time limit.
  const results = await mapLimit(toInvite, SEND_CONCURRENCY, (email) => issueInvitation(email, role, ctx));
  const failed = toInvite.flatMap((email, i) => {
    const sent = results[i];
    return sent.ok ? [] : [{ email, error: sent.error }];
  });
  await recordColdMail(ctx.workspace.id, toInvite.length);
  return { invited: toInvite, alreadyMembers: [...members], failed };
}

/**
 * Invites the account behind `email` to take over someone added without email. Nobody is pulled into a workspace
 * without saying yes: the placeholder stays as it is until they accept. Throws MailLimitError over today's limit.
 */
export async function invitePlaceholder(member: { id: string; role: Role }, email: string, ctx: InviteContext): Promise<SendResult> {
  await assertColdMailRoom(ctx.workspace.id, 1);
  const sent = await issueInvitation(email, member.role, ctx, member.id);
  await recordColdMail(ctx.workspace.id, 1);
  return sent;
}

export async function resendInvitation(invitationId: string, ctx: InviteContext): Promise<SendResult | null> {
  const invite = await db.invitation.findFirst({
    where: { id: invitationId, workspaceId: ctx.workspace.id, acceptedAt: null, revokedAt: null },
  });
  if (!invite) return null;
  await assertColdMailRoom(ctx.workspace.id, 1);
  const sent = await issueInvitation(invite.email, invite.role, ctx);
  await recordColdMail(ctx.workspace.id, 1);
  return sent;
}

export type InvitationLookup =
  | { status: "ok"; invitation: { id: string; email: string; role: Role; membershipId: string | null; workspace: { id: string; name: string; slug: string } } }
  | { status: "invalid" | "expired" | "used" | "revoked" };

export async function findInvitation(token: string): Promise<InvitationLookup> {
  const invitation = await db.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { workspace: { select: { id: true, name: true, slug: true, deletedAt: true } } },
  });
  if (!invitation || invitation.workspace.deletedAt) return { status: "invalid" };
  if (invitation.acceptedAt) return { status: "used" };
  if (invitation.revokedAt) return { status: "revoked" };
  if (invitation.expiresAt < new Date()) return { status: "expired" };
  return { status: "ok", invitation };
}

/** Turns an invitation into a membership for the signed-in user. Returns the workspace slug. */
export async function acceptInvitation(token: string, user: { id: string; email: string }) {
  const found = await findInvitation(token);
  const t = (await getMessages()).errors.invitation;
  if (found.status !== "ok") throw new Error(t[found.status]);
  const { invitation } = found;
  if (normalizeEmail(user.email) !== invitation.email) {
    throw new Error(t.otherEmail(invitation.email));
  }

  if (invitation.membershipId && (await takeOverPlaceholder(invitation.membershipId, invitation, user))) {
    return invitation.workspace.slug;
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

/**
 * Moves someone added without email onto the account that accepted the invitation: their membership, allowance and
 * bookings carry over, and the placeholder user is deleted. Returns false when the placeholder is gone, removed or
 * already has an address, so the invitation is accepted like any other.
 */
async function takeOverPlaceholder(membershipId: string, invitation: { id: string; workspace: { id: string } }, user: { id: string }) {
  const placeholder = await db.membership.findFirst({
    where: { id: membershipId, workspaceId: invitation.workspace.id, removedAt: null },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  if (!placeholder || !hasNoEmail(placeholder.user.email)) return false;
  const account = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { name: true, memberships: { where: { workspaceId: invitation.workspace.id }, select: { id: true } } },
  });
  // Unlinked so deleting the placeholder below doesn't take the accepted invitation with it.
  const accepted = db.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date(), membershipId: null } });
  const name = !account.name && placeholder.user.name ? [db.user.update({ where: { id: user.id }, data: { name: placeholder.user.name } })] : [];
  const [already] = account.memberships;
  if (!already) {
    await db.$transaction([
      db.membership.update({ where: { id: placeholder.id }, data: { userId: user.id } }),
      ...name,
      accepted,
      db.user.delete({ where: { id: placeholder.user.id } }),
    ]);
    return true;
  }
  // They joined meanwhile through another invitation: their bookings move over and the placeholder goes.
  await db.$transaction([
    db.booking.updateMany({ where: { membershipId: placeholder.id }, data: { membershipId: already.id } }),
    db.membership.update({ where: { id: already.id }, data: { removedAt: null } }),
    ...name,
    accepted,
    db.user.delete({ where: { id: placeholder.user.id } }),
  ]);
  return true;
}
