import { toISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { getMessages } from "@/lib/i18n/server";
import { removeSampleTeam } from "@/lib/sample-team-db";
import { cancelSubscriptionNow } from "@/lib/stripe";

/**
 * What deleting this user's account would do to their workspaces:
 * - `blocked`: workspaces where they are the only admin but others remain; someone else must become admin first.
 * - `alone`: workspaces where they are the only member left; these are deleted with the account.
 */
export async function accountDeletionPlan(userId: string) {
  const memberships = await db.membership.findMany({
    where: { userId, removedAt: null },
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          stripeSubscriptionId: true,
          // Sample people don't count: a workspace with only them left goes with the account.
          memberships: { where: { removedAt: null, isSample: false }, select: { userId: true, role: true } },
        },
      },
    },
  });
  const blocked: { name: string; slug: string }[] = [];
  const alone: { id: string; name: string; stripeSubscriptionId: string | null }[] = [];
  for (const m of memberships) {
    const others = m.workspace.memberships.filter((o) => o.userId !== userId);
    if (others.length === 0) {
      alone.push({ id: m.workspace.id, name: m.workspace.name, stripeSubscriptionId: m.workspace.stripeSubscriptionId });
    }
    else if (m.role === "ADMIN" && !others.some((o) => o.role === "ADMIN")) {
      blocked.push({ name: m.workspace.name, slug: m.workspace.slug });
    }
  }
  return { blocked, alone };
}

/** Deletes the user, their memberships and bookings, and the workspaces only they were in. */
export async function deleteAccount(userId: string) {
  const { blocked, alone } = await accountDeletionPlan(userId);
  if (blocked.length) throw new Error((await getMessages()).errors.makeSomeoneAdmin);
  for (const w of alone) await cancelSubscriptionNow(w.stripeSubscriptionId);
  await removeSampleTeam(alone.map((w) => w.id));
  await db.$transaction([
    db.workspace.deleteMany({ where: { id: { in: alone.map((w) => w.id) } } }),
    // Memberships, bookings, sessions and sign-in accounts cascade; links to them from others' records are cleared.
    db.user.delete({ where: { id: userId } }),
  ]);
}

/** Everything stored about one person, for a GDPR access request. */
export async function exportAccount(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      createdAt: true,
      memberships: {
        include: {
          workspace: { select: { name: true } },
          bookings: { orderBy: { startDate: "asc" } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  return {
    exportedAt: new Date().toISOString(),
    name: user.name,
    email: user.email,
    accountCreatedAt: user.createdAt.toISOString(),
    workspaces: user.memberships.map((m) => ({
      workspace: m.workspace.name,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
      removedAt: m.removedAt?.toISOString() ?? null,
      yearlyAllowanceDays: m.annualAllowanceDays === null ? null : Number(m.annualAllowanceDays),
      holidayRegion: m.holidayRegion,
      workDays: m.workDays,
      employmentStart: m.employmentStart ? toISO(m.employmentStart) : null,
      calendarFeedEnabled: m.calendarToken !== null,
      bookings: m.bookings.map((b) => ({
        start: toISO(b.startDate),
        end: toISO(b.endDate),
        startPart: b.startPart,
        endPart: b.endPart,
        type: b.type,
        status: b.status,
        days: Number(b.daysCount),
        note: b.note,
        decisionNote: b.decisionNote,
        createdAt: b.createdAt.toISOString(),
      })),
    })),
  };
}
