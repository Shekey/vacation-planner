import { db } from "@/lib/db";
import { SAMPLE_EMAIL_DOMAIN } from "@/lib/sample-team";
import { removeSampleTeam } from "@/lib/sample-team-db";
import { auditCutoff, restoreCutoff } from "@/lib/undo";

/** Bookings and removed members are kept this long: the time employees can still claim leave in Germany. */
export const RETENTION_YEARS = 3;

/** Sick days are health data, so they go sooner: once they no longer matter for the current or last year. */
export const SICK_RETENTION_MONTHS = 12;

/** Deletes data the app no longer needs. Runs from the daily housekeeping cron. */
export async function purgeOldData(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - RETENTION_YEARS);
  const sickCutoff = new Date(now);
  sickCutoff.setUTCMonth(sickCutoff.getUTCMonth() - SICK_RETENTION_MONTHS);
  const monthAgo = new Date(now.getTime() - 30 * 86_400_000);

  // Workspaces deleted more than RESTORE_DAYS ago go for good. Their sample people's placeholder users
  // are deleted first, because the workspace's cascade would leave those users behind.
  const expired = await db.workspace.findMany({ where: { deletedAt: { lt: restoreCutoff(now) } }, select: { id: true } });
  await removeSampleTeam(expired.map((w) => w.id));

  const [workspaces, audit, bookings, members, invitations, sessions, tokens, sampleUsers, coldMails] = await db.$transaction([
    db.workspace.deleteMany({ where: { id: { in: expired.map((w) => w.id) } } }),
    db.auditEvent.deleteMany({ where: { createdAt: { lt: auditCutoff(now) } } }),
    db.booking.deleteMany({ where: { OR: [{ endDate: { lt: cutoff } }, { type: "SICK", endDate: { lt: sickCutoff } }] } }),
    // Their remaining bookings go with them.
    db.membership.deleteMany({ where: { removedAt: { lt: cutoff } } }),
    // Used, revoked or expired invitations only hold an email address.
    db.invitation.deleteMany({
      where: { createdAt: { lt: monthAgo }, OR: [{ acceptedAt: { not: null } }, { revokedAt: { not: null } }, { expiresAt: { lt: now } }] },
    }),
    db.session.deleteMany({ where: { expires: { lt: now } } }),
    db.verificationToken.deleteMany({ where: { expires: { lt: now } } }),
    // Sample people left without a workspace, e.g. after a purge of removed members.
    db.user.deleteMany({ where: { email: { endsWith: `@${SAMPLE_EMAIL_DOMAIN}` }, memberships: { none: {} } } }),
    // Only the last day's count matters for the daily email limit (src/lib/mail-limits.ts).
    db.coldMail.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 7 * 86_400_000) } } }),
  ]);
  return {
    workspaces: workspaces.count,
    auditEvents: audit.count,
    bookings: bookings.count,
    members: members.count,
    invitations: invitations.count,
    sessions: sessions.count,
    tokens: tokens.count,
    sampleUsers: sampleUsers.count,
    coldMails: coldMails.count,
  };
}
