import { portionOn } from "@/lib/booking-days";
import { activeBookingsBetween, allowanceSummaries, loadHolidays, spanOf, withDays, type Settings } from "@/lib/bookings";
import { eachDay, type ISODate } from "@/lib/dates";
import { db } from "@/lib/db";
import { understaffedDays } from "@/lib/staffing";

/** Pending requests with what an approver needs next to them: days left, who else is off, and short-staffed days. */
export async function reviewRequests(workspace: { id: string }, settings: Settings, where: { id?: string }, today: ISODate) {
  const year = Number(today.slice(0, 4));
  const saved = await db.booking.findMany({
    where: { workspaceId: workspace.id, status: "PENDING", membership: { removedAt: null }, ...where },
    include: { membership: { include: { user: { select: { name: true, email: true } } } }, leaveType: { select: { name: true, color: true } } },
    orderBy: { startDate: "asc" },
  });

  // Counted like the allowance shown next to it, not the count stored when the request was made.
  const pending = await withDays(workspace.id, settings, saved);

  // Staffing counts use the team's main region; each person's own allowance uses theirs.
  const holidays = await loadHolidays(workspace.id, settings.holidayRegion ?? "");
  const memberCount = await db.membership.count({ where: { workspaceId: workspace.id, removedAt: null } });
  // A few queries for all requests together, not a handful per request: the allowance of everyone asking,
  // per year a request starts in, and the team's bookings across all requested days.
  const yearOf = (b: (typeof pending)[number]) => Number(spanOf(b).start.slice(0, 4)) || year;
  const years = [...new Set(pending.map(yearOf))];
  const summaries = new Map(
    await Promise.all(
      years.map(async (y) => {
        const asking = [...new Map(pending.filter((b) => yearOf(b) === y).map((b) => [b.membershipId, b.membership])).values()];
        return [y, await allowanceSummaries(asking, settings, y, today)] as const;
      }),
    ),
  );
  const spans = pending.map(spanOf);
  const teamBookings =
    pending.length === 0
      ? []
      : await activeBookingsBetween(
          workspace.id,
          spans.reduce((min, x) => (x.start < min ? x.start : min), spans[0].start),
          spans.reduce((max, x) => (x.end > max ? x.end : max), spans[0].end),
        );
  const rows = pending.map((b) => {
    const span = spanOf(b);
    const summary = summaries.get(yearOf(b))!.get(b.membershipId)!;
    const others = teamBookings.filter((o) => spanOf(o).start <= span.end && spanOf(o).end >= span.start);
    const days = eachDay(span.start, span.end);
    const clashes = [
      ...new Set(
        others
          .filter((o) => o.membershipId !== b.membershipId && days.some((d) => portionOn(spanOf(o), d)))
          .map((o) => o.membership.user.name ?? o.membership.user.email),
      ),
    ];
    // Approved bookings only: other pending requests may still be declined.
    const shortDays = understaffedDays({
      candidate: { ...span, membershipId: b.membershipId },
      team: others
        .filter((o) => o.id !== b.id && o.membershipId !== b.membershipId && o.status === "APPROVED")
        .map((o) => ({ ...spanOf(o), membershipId: o.membershipId })),
      memberCount,
      minPresent: settings.minPeoplePresent,
      rules: { countWeekends: settings.countWeekends, workDays: b.membership.workDays, holidays },
    });
    return { b, span, summary, clashes, shortDays };
  });
  return { rows, memberCount };
}

export type RequestReview = Awaited<ReturnType<typeof reviewRequests>>["rows"][number];
