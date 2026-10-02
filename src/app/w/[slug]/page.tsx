import Link from "next/link";
import { TypeDot, typeLabel } from "@/components/badges";
import { Avatar, EmptyState } from "@/components/ui";
import { halfDayLabel, portionOn } from "@/lib/booking-days";
import { activeBookingsBetween, allowanceSummary, loadHolidays, regionOf, spanOf } from "@/lib/bookings";
import { addDays, eachDay, formatDate, formatRange, fromISO, partOfDay, relativeDay, toISO, todayIn } from "@/lib/dates";
import { daysAtRisk, longWeekendTips } from "@/lib/smart-days";
import { db } from "@/lib/db";
import { requireMembership, settingsOf } from "@/lib/session";

export const metadata = { title: "Overview" };

export default async function OverviewPage({ params }: PageProps<"/w/[slug]">) {
  const { slug } = await params;
  const { workspace, membership, user } = await requireMembership(slug);
  const settings = settingsOf(workspace);
  const today = todayIn(workspace.timezone);
  const horizon = addDays(today, 14);
  const tipsUntil = addDays(today, 120);
  const year = Number(today.slice(0, 4));
  const myRegion = regionOf(membership, settings);
  const holidays = await loadHolidays(workspace.id, myRegion);

  const [bookings, summary, pendingCount, nextOff, nextHoliday, myBookings] = await Promise.all([
    activeBookingsBetween(workspace.id, today, horizon),
    allowanceSummary(membership, settings, year, holidays),
    membership.role === "ADMIN" && settings.approvalsEnabled
      ? db.booking.count({ where: { workspaceId: workspace.id, status: "PENDING" } })
      : 0,
    db.booking.findFirst({
      where: { membershipId: membership.id, status: { in: ["PENDING", "APPROVED"] }, endDate: { gte: fromISO(today) } },
      orderBy: { startDate: "asc" },
      select: { startDate: true, endDate: true },
    }),
    db.holiday.findFirst({
      where: { workspaceId: workspace.id, date: { gte: fromISO(today) }, region: { in: [...new Set(["", myRegion])] } },
      orderBy: { date: "asc" },
    }),
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

  const firstName = (user.name ?? "").split(" ")[0];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Good {partOfDay(workspace.timezone)}
          {firstName ? `, ${firstName}` : ""}
        </h2>
        <p className="text-sm text-muted">{formatDate(today, { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      {pendingCount > 0 && (
        <Link
          href={`/w/${slug}/approvals`}
          className="card card-link flex items-center justify-between gap-3 border-amber-400/60 bg-amber-50 text-sm font-medium dark:bg-amber-900/20"
        >
          <span>
            {pendingCount} request{pendingCount === 1 ? "" : "s"} waiting for your approval
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label={`Days left in ${year}`}
          value={summary.remaining === null ? `${fmt(summary.used)} taken` : `${fmt(summary.remaining)} days`}
          href={`/w/${slug}/me`}
        >
          {summary.allowance !== null && summary.allowance > 0 ? (
            <div className="space-y-1">
              <div className="flex h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/15" aria-hidden>
                <div className="bg-sky-500" style={{ width: `${Math.min(100, (summary.used / summary.allowance) * 100)}%` }} />
                <div
                  className="pending-stripes bg-sky-500/70"
                  style={{ width: `${Math.min(100, (summary.pending / summary.allowance) * 100)}%` }}
                />
              </div>
              <div className="text-xs text-muted">
                of {fmt(summary.allowance)}
                {summary.pending ? ` · ${fmt(summary.pending)} pending` : ""}
              </div>
            </div>
          ) : (
            <span className="text-sm text-muted">No yearly allowance set</span>
          )}
        </Stat>
        <Stat
          label="Your next time off"
          value={nextOff ? formatRange(toISO(nextOff.startDate), toISO(nextOff.endDate)) : "Nothing booked"}
          href={nextOff ? `/w/${slug}/me` : `/w/${slug}/book`}
        >
          {nextOff ? (
            <span className="text-sm text-muted">{toISO(nextOff.startDate) <= today ? "You're off now 🌴" : `Starts ${relativeDay(today, toISO(nextOff.startDate))}`}</span>
          ) : (
            <span className="text-sm text-primary">Plan some time off →</span>
          )}
        </Stat>
        <Stat
          label="Next public holiday"
          value={nextHoliday ? nextHoliday.name : "None added"}
          href={`/w/${slug}/holidays`}
        >
          <span className="text-sm text-muted">
            {nextHoliday
              ? `${formatDate(toISO(nextHoliday.date), { weekday: "short", day: "numeric", month: "short" })} · ${relativeDay(today, toISO(nextHoliday.date))}`
              : "See the holidays page"}
          </span>
        </Stat>
      </div>

      {atRisk > 0 && (
        <Link
          href={`/w/${slug}/book`}
          className="card card-link block border-amber-400/60 bg-amber-50 text-sm dark:bg-amber-900/20"
        >
          {fmt(atRisk)} of your {fmt(summary.remaining!)} days left will be lost on 31 Dec
          {settings.maxCarryOverDays ? ` (only ${fmt(settings.maxCarryOverDays)} carry over to ${year + 1})` : ""}. Plan them now →
        </Link>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="font-medium">Out today</h2>
          {offToday.length === 0 ? (
            <EmptyState icon="☀️">Everyone&apos;s in today.</EmptyState>
          ) : (
            <ul className="space-y-2 text-sm">
              {offToday.map((b) => {
                const portion = portionOn(spanOf(b), today);
                return (
                  <li key={b.id} className="flex items-center gap-2.5">
                    <Avatar label={name(b)} seed={b.membership.user.email} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className="truncate">{name(b)}</span>
                        <TypeDot type={b.type} decorative={portion === "FULL"} />
                      </div>
                      <div className="text-muted">
                        {portion === "AM" ? "Morning" : portion === "PM" ? "Afternoon" : typeLabel(b.type)}
                        {b.status === "PENDING" && " (pending)"} · until {formatDate(spanOf(b).end, { weekday: "short", day: "numeric", month: "short" })}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-medium">Next two weeks</h2>
            <Link href={`/w/${slug}/calendar`} className="text-sm whitespace-nowrap text-primary hover:underline">
              Full calendar →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState icon="🗓️">Nobody has time off planned.</EmptyState>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {upcoming.map((b) => {
                const span = spanOf(b);
                const half = halfDayLabel(span);
                return (
                  <li key={b.id} className="flex items-center gap-2.5 py-2">
                    <Avatar label={name(b)} seed={b.membership.user.email} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className="truncate">{name(b)}</span>
                        <TypeDot type={b.type} />
                      </div>
                      <div className="text-muted">
                        {formatRange(span.start, span.end)}
                        {half && ` (${half})`}
                        {b.status === "PENDING" && " · pending"}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted">{relativeDay(today, span.start)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {tips.length > 0 && (
        <section className="card space-y-2 bg-gradient-to-br from-sky-50 to-teal-50 dark:from-sky-950/40 dark:to-teal-950/30">
          <h2 className="font-medium">
            <span aria-hidden>✨ </span>Long-weekend tips
          </h2>
          <ul className="divide-y divide-border text-sm">
            {tips.map((t) => (
              <li key={t.bookFrom} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  Take <span className="font-medium">{dayList(t.bookFrom, t.bookTo)}</span> off and get{" "}
                  <span className="font-medium">{t.length} days</span> in a row ({formatRange(t.start, t.end)}), using {t.cost}{" "}
                  {t.cost === 1 ? "day" : "days"}.
                </span>
                <Link href={`/w/${slug}/book?start=${t.bookFrom}&end=${t.bookTo}`} className="btn-secondary px-3 py-1 text-sm">
                  Book it
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}

function Stat({ label, value, href, children }: { label: string; value: string; href?: string; children?: React.ReactNode }) {
  const body = (
    <>
      <div className="eyebrow">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold tracking-tight">{value}</div>
      <div className="mt-1 min-h-6">{children}</div>
    </>
  );
  return href ? (
    <Link href={href} className="card card-link block">
      {body}
    </Link>
  ) : (
    <div className="card">{body}</div>
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
