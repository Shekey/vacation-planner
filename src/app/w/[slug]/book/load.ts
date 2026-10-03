import { activeBookingsBetween, allowanceSummary, regionOf, spanOf } from "@/lib/bookings";
import { addDays, fromISO, toISO, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import type { requireMembership } from "@/lib/session";
import { settingsOf } from "@/lib/session";

type Ctx = Awaited<ReturnType<typeof requireMembership>>;

/** Everything the booking form needs: members (with allowance), team bookings for clash hints. */
export async function loadBookingFormData(ctx: Ctx) {
  const { workspace, membership } = ctx;
  const settings = settingsOf(workspace);
  const isAdmin = membership.role === "ADMIN";
  const today = todayIn(workspace.timezone);
  const currentYear = Number(today.slice(0, 4));

  // All regions' holidays; the form keeps the ones for the person being booked.
  const holidays = (
    await db.holiday.findMany({
      where: { workspaceId: workspace.id, date: { gte: fromISO(addDays(today, -366)), lte: fromISO(addDays(today, 731)) } },
      orderBy: { date: "asc" },
    })
  ).map((h) => ({ date: toISO(h.date), name: h.name, region: h.region }));
  const memberCount = await db.membership.count({ where: { workspaceId: workspace.id, removedAt: null } });

  const memberships = await db.membership.findMany({
    where: { workspaceId: workspace.id, removedAt: null, ...(isAdmin ? {} : { id: membership.id }) },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { user: { email: "asc" } },
  });
  const members = await Promise.all(
    memberships.map(async (m) => {
      const s = await allowanceSummary(m, settings, currentYear, undefined, today);
      const label = m.user.name ?? m.user.email;
      return {
        id: m.id,
        name: m.id === membership.id ? `${label} (you)` : label,
        allowance: s.allowance,
        takenThisYear: s.used + s.pending,
        region: regionOf(m, settings),
        workDays: m.workDays,
      };
    }),
  );
  members.sort((a, b) => Number(b.id === membership.id) - Number(a.id === membership.id));

  const bookings = await activeBookingsBetween(workspace.id, addDays(today, -31), addDays(today, 400));
  const team = bookings.map((b) => ({
    ...spanOf(b),
    id: b.id,
    membershipId: b.membershipId,
    name: b.membership.user.name ?? b.membership.user.email,
  }));

  return { settings, isAdmin, today, currentYear, members, team, holidays, memberCount };
}
