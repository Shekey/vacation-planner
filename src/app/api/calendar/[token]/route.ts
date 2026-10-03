import { activeBookingsBetween, forViewer, regionOf, spanOf } from "@/lib/bookings";
import { halfDayLabel } from "@/lib/booking-days";
import { addDays, fromISO, toISO, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { buildCalendar, type CalendarEvent } from "@/lib/ical";

const TYPE = { VACATION: "vacation", SICK: "sick leave", OTHER: "time off" } as const;

/** Team calendar as an iCal feed. The URL token is the only credential, so it is long and revocable. */
export async function GET(_req: Request, ctx: RouteContext<"/api/calendar/[token]">) {
  const { token } = await ctx.params;
  const membership = await db.membership.findUnique({
    where: { calendarToken: token.replace(/\.ics$/, "") },
    include: { workspace: { include: { settings: true } } },
  });
  if (!membership || membership.removedAt) return new Response("Not found", { status: 404 });

  const { workspace } = membership;
  const today = todayIn(workspace.timezone);
  const from = addDays(today, -90);
  const to = addDays(today, 400);
  const [bookings, holidays] = await Promise.all([
    activeBookingsBetween(workspace.id, from, to).then((bs) =>
      forViewer(bs, { membershipId: membership.id, role: membership.role }, { hideSickType: workspace.settings?.hideSickType ?? true }),
    ),
    // The feed owner's holidays: nationwide plus their region's.
    db.holiday.findMany({
      where: {
        workspaceId: workspace.id,
        date: { gte: fromISO(from), lte: fromISO(to) },
        region: { in: [...new Set(["", regionOf(membership, { holidayRegion: workspace.settings?.holidayRegion ?? null })])] },
      },
    }),
  ]);

  const events: CalendarEvent[] = [
    ...bookings.map((b) => {
      const span = spanOf(b);
      const who = b.membership.user.name ?? b.membership.user.email;
      const half = halfDayLabel(span);
      return {
        uid: b.id,
        start: span.start,
        end: span.end,
        summary: `${who}: ${TYPE[b.type]}${half ? ` (${half})` : ""}${b.status === "PENDING" ? " – pending" : ""}`,
        description: b.note ?? undefined,
      };
    }),
    ...holidays.map((h) => ({ uid: `holiday-${h.id}`, start: toISO(h.date), end: toISO(h.date), summary: `Holiday: ${h.name}` })),
  ];

  return new Response(buildCalendar(`${workspace.name} time off`, events), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${workspace.slug}.ics"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
