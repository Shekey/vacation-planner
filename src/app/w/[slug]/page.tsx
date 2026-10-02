import Link from "next/link";
import { AllowanceCard } from "@/components/allowance-card";
import { TypeDot, typeLabel } from "@/components/badges";
import { halfDayLabel, portionOn } from "@/lib/booking-days";
import { activeBookingsBetween, allowanceSummary, loadHolidays, spanOf } from "@/lib/bookings";
import { addDays, eachDay, formatDate, formatRange, fromISO, toISO, todayIn } from "@/lib/dates";
import { daysAtRisk, longWeekendTips } from "@/lib/smart-days";
import { db } from "@/lib/db";
import { requireMembership, settingsOf } from "@/lib/session";

export default async function OverviewPage({ params }: PageProps<"/w/[slug]">) {
  const { slug } = await params;
  const { workspace, membership } = await requireMembership(slug);
  const settings = settingsOf(workspace);
  const today = todayIn(workspace.timezone);
  const horizon = addDays(today, 14);
  const tipsUntil = addDays(today, 120);
  const year = Number(today.slice(0, 4));
  const holidays = await loadHolidays(workspace.id);

  const [bookings, summary, pendingCount, myUpcoming, nextHoliday, myBookings] = await Promise.all([
    activeBookingsBetween(workspace.id, today, horizon),
    allowanceSummary(membership, settings, year, holidays),
    membership.role === "ADMIN" && settings.approvalsEnabled
      ? db.booking.count({ where: { workspaceId: workspace.id, status: "PENDING" } })
      : 0,
    db.booking.count({
      where: { membershipId: membership.id, status: { in: ["PENDING", "APPROVED"] }, endDate: { gte: fromISO(today) } },
    }),
    db.holiday.findFirst({ where: { workspaceId: workspace.id, date: { gte: fromISO(today) } }, orderBy: { date: "asc" } }),
    db.booking.findMany({
      where: {
        membershipId: membership.id,
        status: { in: ["PENDING", "APPROVED"] },
        endDate: { gte: fromISO(today) },
        startDate: { lte: fromISO(addDays(tipsUntil, 7)) },
      },
      select: { startDate: true, endDate: true },
    }),
  ]);

  const alreadyOff = new Set(myBookings.flatMap((b) => eachDay(toISO(b.startDate), toISO(b.endDate))));
  const tips = longWeekendTips({
    from: addDays(today, 1),
    to: tipsUntil,
    rules: { countWeekends: settings.countWeekends, holidays },
    alreadyOff,
  }).slice(0, 3);
  // From October on, warn about days that won't carry over into next year.
  const atRisk = today.slice(5, 7) >= "10" ? daysAtRisk(summary.remaining, settings.maxCarryOverDays) : 0;

  const offToday = bookings.filter((b) => portionOn(spanOf(b), today));
  const upcoming = bookings.filter((b) => !portionOn(spanOf(b), today));
  const name = (b: (typeof bookings)[number]) => b.membership.user.name ?? b.membership.user.email;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {pendingCount > 0 && (
        <Link
          href={`/w/${slug}/approvals`}
          className="card border-amber-400 bg-amber-50 md:col-span-2 dark:bg-amber-900/20"
        >
          {pendingCount} request{pendingCount === 1 ? "" : "s"} waiting for your approval →
        </Link>
      )}

      <section className="card space-y-2">
        <h2 className="font-medium">Out today</h2>
        {offToday.length === 0 ? (
          <p className="text-sm opacity-70">Everyone&apos;s in.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {offToday.map((b) => {
              const portion = portionOn(spanOf(b), today);
              return (
                <li key={b.id} className="flex items-center gap-2">
                  <TypeDot type={b.type} />
                  <span className="font-medium">{name(b)}</span>
                  <span className="opacity-70">
                    {portion === "AM" ? "morning" : portion === "PM" ? "afternoon" : typeLabel(b.type).toLowerCase()}
                    {b.status === "PENDING" && " (pending)"} · until {formatRange(spanOf(b).end, spanOf(b).end)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="space-y-4">
        <AllowanceCard summary={summary} />
        {atRisk > 0 && (
          <Link
            href={`/w/${slug}/book`}
            className="card block border-amber-400 bg-amber-50 text-sm dark:bg-amber-900/20"
          >
            {fmt(atRisk)} of your {fmt(summary.remaining!)} days left will be lost on 31 Dec
            {settings.maxCarryOverDays ? ` (only ${fmt(settings.maxCarryOverDays)} carry over to ${year + 1})` : ""}. Plan them now →
          </Link>
        )}
        {nextHoliday && (
          <Link href={`/w/${slug}/holidays`} className="card block text-sm hover:bg-black/5 dark:hover:bg-white/5">
            Next holiday: <span className="font-medium">{nextHoliday.name}</span>,{" "}
            {formatRange(toISO(nextHoliday.date), toISO(nextHoliday.date))}
          </Link>
        )}
      </div>

      {tips.length > 0 && (
        <section className="card space-y-2 md:col-span-2">
          <h2 className="font-medium">Long-weekend tips</h2>
          <ul className="divide-y divide-black/5 text-sm dark:divide-white/10">
            {tips.map((t) => (
              <li key={t.bookFrom} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                <span>
                  Take <span className="font-medium">{dayList(t.bookFrom, t.bookTo)}</span> off and get{" "}
                  <span className="font-medium">{t.length} days</span> in a row ({formatRange(t.start, t.end)}), using {t.cost}{" "}
                  {t.cost === 1 ? "day" : "days"}.
                </span>
                <Link href={`/w/${slug}/book?start=${t.bookFrom}&end=${t.bookTo}`} className="underline">
                  Book it
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card space-y-2 md:col-span-2">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">Coming up in the next two weeks</h2>
          <Link href={`/w/${slug}/calendar`} className="text-sm underline">
            Full calendar
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm opacity-70">Nobody has time off planned.</p>
        ) : (
          <ul className="divide-y divide-black/5 text-sm dark:divide-white/10">
            {upcoming.map((b) => {
              const span = spanOf(b);
              const half = halfDayLabel(span);
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-2 py-1.5">
                  <TypeDot type={b.type} />
                  <span className="font-medium">{name(b)}</span>
                  <span className="opacity-70">
                    {formatRange(span.start, span.end)}
                    {half && ` (${half})`}
                    {b.status === "PENDING" && " · pending"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {myUpcoming === 0 && (
        <p className="text-sm opacity-70 md:col-span-2">
          You have nothing booked.{" "}
          <Link href={`/w/${slug}/book`} className="underline">
            Plan some time off
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** "Fri 16 Oct" or "Mon 12 and Tue 13 Oct". */
function dayList(from: string, to: string) {
  const opts = { weekday: "short", day: "numeric", month: "short" } as const;
  if (from === to) return formatDate(from, opts);
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  return `${formatDate(from, sameMonth ? { weekday: "short", day: "numeric" } : opts)} and ${formatDate(to, opts)}`;
}
