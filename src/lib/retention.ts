import { db } from "@/lib/db";

/** Bookings and removed members are kept this long: the time employees can still claim leave in Germany. */
export const RETENTION_YEARS = 3;

/** Deletes data the app no longer needs. Runs from the monthly cron. */
export async function purgeOldData(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - RETENTION_YEARS);
  const monthAgo = new Date(now.getTime() - 30 * 86_400_000);

  const [bookings, members, invitations, sessions, tokens] = await db.$transaction([
    db.booking.deleteMany({ where: { endDate: { lt: cutoff } } }),
    // Their remaining bookings go with them.
    db.membership.deleteMany({ where: { removedAt: { lt: cutoff } } }),
    // Used, revoked or expired invitations only hold an email address.
    db.invitation.deleteMany({
      where: { createdAt: { lt: monthAgo }, OR: [{ acceptedAt: { not: null } }, { revokedAt: { not: null } }, { expiresAt: { lt: now } }] },
    }),
    db.session.deleteMany({ where: { expires: { lt: now } } }),
    db.verificationToken.deleteMany({ where: { expires: { lt: now } } }),
  ]);
  return {
    bookings: bookings.count,
    members: members.count,
    invitations: invitations.count,
    sessions: sessions.count,
    tokens: tokens.count,
  };
}
