import { activeBookingsBetween, forViewer, regionOf, spanOf } from "@/lib/bookings";
import { halfDayLabel } from "@/lib/booking-days";
import { addDays, fromISO, toISO, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { isLocale, messagesFor } from "@/lib/i18n";
import { buildCalendar, type CalendarEvent } from "@/lib/ical";

/** Team calendar as an iCal feed. The URL token is the only credential, so it is long and revocable. */
export async function GET(_req: Request, ctx: RouteContext<"/api/calendar/[token]">) {
  const { token } = await ctx.params;
  const membership = await db.membership.findUnique({
    where: { calendarToken: token.replace(/\.ics$/, "") },
    include: { workspace: { include: { settings: true } }, user: { select: { locale: true } } },
  });
  if (!membership || membership.removedAt) return new Response("Not found", { status: 404 });

  const { workspace } = membership;
  // The feed owner's language, else the workspace's.
  const locale = isLocale(membership.user.locale)
    ? membership.user.locale
    : isLocale(workspace.settings?.locale)
      ? workspace.settings.locale
      : "en";
  const t = messagesFor(locale).chat.feed;
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
      const half = halfDayLabel(span, locale);
      return {
        uid: b.id,
        start: span.start,
        end: span.end,
        summary: `${who}: ${t.type[b.type]}${half ? ` (${half})` : ""}${b.status === "PENDING" ? ` – ${t.pending}` : ""}`,
        description: b.note ?? undefined,
      };
    }),
    ...holidays.map((h) => ({ uid: `holiday-${h.id}`, start: toISO(h.date), end: toISO(h.date), summary: t.holiday(h.name) })),
  ];

  return new Response(buildCalendar(t.title(workspace.name), events), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${workspace.slug}.ics"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
