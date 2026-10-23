import { activeBookingsBetween, allowanceSummaries, leaveTypeUsage, pickableLeaveTypes, regionOf, spanOf } from "@/lib/bookings";
import { addDays, fromISO, toISO, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { getLocale, getMessages } from "@/lib/i18n/server";
import type { requireMembership } from "@/lib/session";
import { settingsOf } from "@/lib/session";
import { holidayName } from "@/lib/holidays";
import { can } from "@/lib/permissions";
import { notFound } from "next/navigation";

type Ctx = Awaited<ReturnType<typeof requireMembership>>;

/**
 * Everything the booking form needs: members (with allowance), team bookings for clash hints, and the admin's own leave
 * types with what each person used of them. `keepLeaveType` keeps an archived type on the booking being edited.
 */
export async function loadBookingFormData(ctx: Ctx, keepLeaveType?: string | null) {
  const { workspace, membership } = ctx;
  const settings = settingsOf(workspace);
  // Admins and approvers book for others (#77); sick days for others stay with admins; viewers don't book.
  const forOthers = can(membership.role, "bookings:manage-all");
  if (!forOthers && !can(membership.role, "bookings:own")) notFound();
  const roles = {
    isAdmin: membership.role === "ADMIN",
    decides: can(membership.role, "bookings:decide"),
    seesSick: can(membership.role, "sick:see"),
    selfId: membership.id,
  };
  const today = todayIn(workspace.timezone);
  const locale = await getLocale();
  const currentYear = Number(today.slice(0, 4));
  const { book: t, common } = await getMessages();

  // All regions' holidays; the form keeps the ones for the person being booked.
  const holidays = (
    await db.holiday.findMany({
      where: { workspaceId: workspace.id, date: { gte: fromISO(addDays(today, -366)), lte: fromISO(addDays(today, 731)) } },
      orderBy: { date: "asc" },
    })
  ).map((h) => ({ date: toISO(h.date), name: holidayName(h, locale), region: h.region }));
  const memberCount = await db.membership.count({ where: { workspaceId: workspace.id, removedAt: null } });

  const memberships = await db.membership.findMany({
    where: { workspaceId: workspace.id, removedAt: null, ...(forOthers ? {} : { id: membership.id }) },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { user: { email: "asc" } },
  });
  // One batch for the whole team: a query per person would run out of database connections in a big team.
  const summaries = await allowanceSummaries(memberships, settings, currentYear, today);
  const members = memberships.map((m) => {
    const s = summaries.get(m.id)!;
    const label = `${m.user.name ?? m.user.email}${m.isSample ? ` (${common.sample})` : ""}`;
    return {
      id: m.id,
      name: m.id === membership.id ? t.you(label) : label,
      allowance: s.allowance,
      takenThisYear: s.used + s.pending,
      region: regionOf(m, settings),
      workDays: m.workDays,
    };
  });
  members.sort((a, b) => Number(b.id === membership.id) - Number(a.id === membership.id));

  const bookings = await activeBookingsBetween(workspace.id, addDays(today, -31), addDays(today, 400));
  const team = bookings.map((b) => ({
    ...spanOf(b),
    id: b.id,
    membershipId: b.membershipId,
    name: b.membership.user.name ?? b.membership.user.email,
    vacation: b.type === "VACATION",
  }));

  const [leaveTypes, leaveTypeUsed] = await Promise.all([
    pickableLeaveTypes(workspace.id, keepLeaveType),
    leaveTypeUsage(workspace.id, currentYear, forOthers ? undefined : [membership.id]),
  ]);

  return { settings, forOthers, roles, today, currentYear, members, team, holidays, memberCount, leaveTypes, leaveTypeUsed };
}
