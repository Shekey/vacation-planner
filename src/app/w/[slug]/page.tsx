import { ArrowRight, CalendarDays, CalendarSearch, Check, Info, Plus, Sun, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { StatusBadge, TypeDot, typeLabel } from "@/components/badges";
import { Avatar, EmptyState, SampleBadge } from "@/components/ui";
import { halfDayLabel, portionOn } from "@/lib/booking-days";
import { activeBookingsBetween, allowanceSummary, forViewer, loadHolidays, regionOf, rulesFor, spanOf } from "@/lib/bookings";
import { addDays, eachDay, formatDate, formatRange, fromISO, isoWeekday, partOfDay, relativeDay, toISO, todayIn } from "@/lib/dates";
import { peopleOff } from "@/lib/staffing";
import { daysAtRisk, longWeekendTips } from "@/lib/smart-days";
import { db } from "@/lib/db";
import { formatNumber, type Locale } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { requireMembership, settingsOf } from "@/lib/session";
import { Onboarding } from "./onboarding";
import { holidayName } from "@/lib/holidays";

export async function generateMetadata() {
  return { title: (await getMessages()).overview.title };
}

export default async function OverviewPage({ params }: PageProps<"/w/[slug]">) {
  const { slug } = await params;
  const { workspace, membership, user } = await requireMembership(slug);
  const locale = await getLocale();
  const { common, overview: t } = await getMessages();
  const fmt = (n: number) => formatNumber(n, locale);
  const settings = settingsOf(workspace);
  const today = todayIn(workspace.timezone);
  // The week strip starts on this week's Monday; the rest looks two weeks ahead.
  const weekStart = addDays(today, 1 - isoWeekday(today));
  const horizon = addDays(today, 14);
  const tipsUntil = addDays(today, 120);
  const year = Number(today.slice(0, 4));
  const myRegion = regionOf(membership, settings);
  const holidays = await loadHolidays(workspace.id, myRegion);

  const [bookings, summary, pendingCount, nextOff, nextHoliday, myBookings, team] = await Promise.all([
    activeBookingsBetween(workspace.id, weekStart, horizon).then((bs) =>
      forViewer(bs, { membershipId: membership.id, role: membership.role }),
    ),
    allowanceSummary(membership, settings, year, holidays, today),
    membership.role === "ADMIN" && settings.approvalsEnabled
      ? db.booking.count({ where: { workspaceId: workspace.id, status: "PENDING" } })
      : 0,
    db.booking.findFirst({
      where: { membershipId: membership.id, status: { in: ["PENDING", "APPROVED"] }, endDate: { gte: fromISO(today) } },
      orderBy: { startDate: "asc" },
      select: { startDate: true, endDate: true, type: true, status: true },
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
    db.membership.findMany({
      where: { workspaceId: workspace.id, removedAt: null },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  const alreadyOff = new Set(myBookings.flatMap((b) => eachDay(toISO(b.startDate), toISO(b.endDate))));
  const tips = longWeekendTips({
    from: addDays(today, 1),
    to: tipsUntil,
    rules: rulesFor(membership, settings, holidays),
    alreadyOff,
  }).slice(0, 3);
  // From October on, warn about days that won't carry over into next year.
  const atRisk = today.slice(5, 7) >= "10" ? daysAtRisk(summary.remaining, settings.maxCarryOverDays) : 0;

  const offToday = bookings.filter((b) => portionOn(spanOf(b), today));
  const upcoming = bookings.filter((b) => spanOf(b).start > today);
  const name = (b: (typeof bookings)[number]) => b.membership.user.name ?? b.membership.user.email;

  const firstName = (user.name ?? "").split(" ")[0];

  // Staffing counts approved time off only; a pending request doesn't reduce who is confirmed to be in.
  const confirmed = bookings.filter((b) => b.status === "APPROVED").map((b) => ({ ...spanOf(b), membershipId: b.membershipId }));
  const inOn = (day: string) => Math.max(0, team.length - peopleOff(confirmed, day));
  const inToday = inOn(today);
  const minPresent = settings.minPeoplePresent;
  const covered = minPresent === null ? null : inToday >= minPresent;
  const weekDays = eachDay(weekStart, addDays(weekStart, 4));
  const awayIds = new Set(offToday.map((b) => b.membershipId));
  const present = team.filter((m) => !awayIds.has(m.id));
  const tipClass = "flex items-start gap-3 rounded-[10px] bg-warning-soft p-4 text-sm text-foreground transition-colors hover:brightness-95";

  const allowance = summary.allowance ?? 0;
  const pct = (n: number) => (allowance > 0 ? Math.min(100, (n / allowance) * 100) : 0);
  const dayName = (day: string) => formatDate(day, { weekday: "short", day: "numeric" }, locale);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <p className="text-xs tracking-wide text-muted uppercase">
            {formatDate(today, { weekday: "long", day: "numeric", month: "long", year: "numeric" }, locale)}
          </p>
          <h1 className="text-[28px] leading-tight font-normal tracking-tight sm:text-[32px]">
            {t.greeting[partOfDay(workspace.timezone)]}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-[15px] text-muted">{t.subtitle}</p>
        </div>
        <Link href={`/w/${slug}/calendar`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <CalendarDays aria-hidden className="size-[18px]" />
          {t.openCalendar}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>

      {membership.role === "ADMIN" && <Onboarding slug={slug} workspace={workspace} />}

      {pendingCount > 0 && (
        <Link href={`/w/${slug}/approvals`} className={`${tipClass} items-center justify-between font-semibold`}>
          <span>{t.pendingRequests(pendingCount)}</span>
          <ArrowRight aria-hidden className="size-4 shrink-0" />
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-[350px_minmax(0,1fr)]">
        <section aria-labelledby="balance-title" className="flex flex-col gap-4 rounded-[18px] bg-primary-soft p-6 text-primary-ink sm:p-7">
          <div className="flex items-start justify-between">
            <h2 id="balance-title" className="text-[13px] font-semibold tracking-wide uppercase">
              {t.yourTimeOff}
            </h2>
            <span className="text-xs">{year}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl leading-[1.05] font-semibold tabular-nums">
              {summary.remaining === null ? fmt(summary.used) : fmt(summary.remaining)}
            </span>
            <span className="text-base">{summary.remaining === null ? t.takenWord : t.daysAvailable(summary.remaining)}</span>
          </div>
          {allowance > 0 ? (
            <>
              <div className="flex h-1.5 gap-[3px]" aria-hidden>
                <div className="rounded-[3px] bg-primary" style={{ width: `${pct(summary.used)}%` }} />
                <div className="pending-stripes rounded-[3px] bg-accent" style={{ width: `${pct(summary.pending)}%` }} />
                <div className="min-w-px flex-1 rounded-[3px] bg-surface" />
              </div>
              <p className="text-xs">{t.balanceLine(fmt(allowance), fmt(summary.used), fmt(summary.pending))}</p>
            </>
          ) : (
            <p className="text-xs">{t.noAllowance}</p>
          )}
          <Link href={`/w/${slug}/book`} className="btn mt-auto w-full min-h-[50px] text-[15px]">
            <Plus aria-hidden className="size-[18px]" />
            {t.requestTimeOff}
          </Link>
        </section>

        <section aria-labelledby="today-title" className="card flex flex-col gap-5 !p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 id="today-title" className="text-[17px] font-normal">
              {t.atWorkToday}
            </h2>
            <Link href={`/w/${slug}/calendar`} className="inline-flex min-h-11 items-center text-[13px] font-semibold text-primary hover:underline">
              {t.viewDay}
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-[158px_minmax(0,1fr)] sm:items-center">
            <div className="space-y-2">
              <p className="text-[28px] leading-snug tabular-nums sm:text-[32px]">{t.inCount(fmt(inToday), fmt(team.length))}</p>
              {covered !== null && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ${
                    covered ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
                  }`}
                >
                  {covered ? <Check aria-hidden className="size-3" strokeWidth={2.5} /> : <TriangleAlert aria-hidden className="size-3" strokeWidth={2.5} />}
                  {covered ? t.staffingCovered : t.belowMinimum}
                </span>
              )}
              {minPresent !== null && <p className="text-xs text-muted">{t.minimumPeople(fmt(minPresent))}</p>}
            </div>
            <div className="min-w-0 space-y-4">
              {offToday.length === 0 ? (
                <EmptyState icon="☀️">{t.everyoneIn}</EmptyState>
              ) : (
                <ul className="space-y-3">
                  {offToday.map((b) => {
                    const portion = portionOn(spanOf(b), today);
                    return (
                      <li key={b.id} className="flex items-center gap-3">
                        <Avatar label={name(b)} className="size-9 text-xs" />
                        <div className="min-w-0 flex-1 text-sm leading-[1.45]">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <span className="truncate">{name(b)}</span>
                            {b.membership.isSample && <SampleBadge label={common.sample} />}
                            <TypeDot type={b.type} decorative locale={locale} />
                          </div>
                          <div className="text-xs text-muted">
                            {portion === "AM" ? common.dayPart.AM : portion === "PM" ? common.dayPart.PM : t.awayUntil(formatDate(spanOf(b).end, { day: "numeric", month: "short" }, locale))}
                            {" · "}
                            {typeLabel(b.type, locale)}
                          </div>
                        </div>
                        <StatusBadge status={b.status} locale={locale} />
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="flex items-center gap-2.5 border-t border-border pt-4">
                <div className="flex -space-x-1" aria-hidden>
                  {present.slice(0, 5).map((m) => (
                    <Avatar key={m.id} label={m.user.name ?? m.user.email} className="size-[30px] text-[11px] ring-2 ring-surface" />
                  ))}
                </div>
                <p className="text-xs text-muted">{t.youAnd(present.length - 1)}</p>
              </div>
            </div>
          </div>
          <ul className="-mx-1 flex gap-2 overflow-x-auto border-t border-border px-1 pt-5 sm:grid sm:grid-cols-5 sm:overflow-visible" aria-label={t.thisWeek}>
            {weekDays.map((d) => (
              <li key={d} className={`min-w-[88px] flex-1 rounded-[10px] p-2.5 ${d === today ? "bg-primary-soft text-primary-ink" : "bg-surface-muted"}`}>
                <p className={`text-[11px] ${d === today ? "font-semibold" : "text-muted"}`}>{dayName(d)}</p>
                <p className="mt-1 text-sm font-semibold tabular-nums">{t.inCount(fmt(inOn(d)), fmt(team.length))}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {summary.carryOverLeft > 0 && summary.carryOverExpiresOn && (
        <Link href={`/w/${slug}/book`} className={tipClass}>
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          {t.carryOverDeadline(
            fmt(summary.carryOverLeft),
            summary.carryOverLeft === 1,
            year - 1,
            formatDate(summary.carryOverExpiresOn, { day: "numeric", month: "long" }, locale),
            relativeDay(today, summary.carryOverExpiresOn, locale),
          )}
        </Link>
      )}

      {atRisk > 0 && (
        <Link href={`/w/${slug}/book`} className={tipClass}>
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          {t.atRisk(
            fmt(atRisk),
            fmt(summary.remaining!),
            settings.maxCarryOverDays ? fmt(settings.maxCarryOverDays) : null,
            year + 1,
            settings.maxCarryOverDays && settings.carryOverExpiry
              ? formatDate(`${year + 1}-${settings.carryOverExpiry}`, { day: "numeric", month: "long" }, locale)
              : null,
          )}
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
        <section aria-labelledby="next-title" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="next-title" className="text-[17px] font-normal">
              {t.nextTimeOff}
            </h2>
            <Link href={`/w/${slug}/me`} className="inline-flex min-h-11 items-center text-[13px] font-semibold text-primary hover:underline">
              {t.myTimeOffLink}
            </Link>
          </div>
          {nextOff ? (
            <div className="card flex flex-col gap-4 !p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="flex items-center gap-2.5 text-sm text-muted">
                  <Sun aria-hidden className="size-5" />
                  {typeLabel(nextOff.type, locale)}
                </span>
                <StatusBadge status={nextOff.status} locale={locale} />
              </div>
              <p className="text-2xl font-semibold tracking-tight">{formatRange(toISO(nextOff.startDate), toISO(nextOff.endDate), locale)}</p>
              <p className="text-sm text-muted">
                {toISO(nextOff.startDate) <= today ? t.offNow : t.starts(relativeDay(today, toISO(nextOff.startDate), locale))}
              </p>
            </div>
          ) : (
            <div className="card flex flex-col items-start gap-3 !p-6">
              <p className="text-2xl font-semibold tracking-tight">{t.nothingBooked}</p>
              <Link href={`/w/${slug}/book`} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
                {t.planTimeOff}
              </Link>
            </div>
          )}
          <p className="flex items-start gap-2.5 px-1 text-xs text-muted">
            <Info aria-hidden className="mt-0.5 size-[18px] shrink-0" />
            {t.allowanceNote(allowance > 0 ? fmt(allowance) : null)}
          </p>
          <Link href={`/w/${slug}/holidays`} className="card card-link flex items-center justify-between gap-3 !py-4 text-sm">
            <span>
              <span className="eyebrow block">{t.nextHoliday}</span>
              <span className="font-semibold">{nextHoliday ? holidayName(nextHoliday, locale) : t.noneAdded}</span>
            </span>
            <span className="text-xs text-muted">
              {nextHoliday
                ? `${formatDate(toISO(nextHoliday.date), { weekday: "short", day: "numeric", month: "short" }, locale)} · ${relativeDay(today, toISO(nextHoliday.date), locale)}`
                : t.seeHolidays}
            </span>
          </Link>
        </section>

        <section aria-labelledby="coming-title" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="coming-title" className="text-[17px] font-normal">
              {t.comingUp}
            </h2>
            <Link href={`/w/${slug}/calendar`} className="inline-flex min-h-11 items-center text-[13px] font-semibold text-primary hover:underline">
              {t.calendarLink}
            </Link>
          </div>
          <div className="card space-y-4 !p-6">
            {upcoming.length === 0 ? (
              <EmptyState icon="🗓️">{t.nobodyPlanned}</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.slice(0, 4).map((b) => {
                  const span = spanOf(b);
                  const half = halfDayLabel(span, locale);
                  return (
                    <li key={b.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <Avatar label={name(b)} className="size-9 text-xs" />
                      <div className="min-w-0 flex-1 text-sm leading-[1.45]">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <span className="truncate">{name(b)}</span>
                          {b.membership.isSample && <SampleBadge label={common.sample} />}
                        </div>
                        <div className="text-xs text-muted">
                          {formatRange(span.start, span.end, locale)}
                          {half && ` (${half})`} · {relativeDay(today, span.start, locale)}
                        </div>
                      </div>
                      <StatusBadge status={b.status} locale={locale} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      {tips.length > 0 && (
        <section aria-labelledby="tips-title" className="space-y-3 rounded-[18px] bg-primary-soft p-5 text-primary-ink sm:p-6">
          <h2 id="tips-title" className="flex items-center gap-2 text-[15px] font-semibold">
            <CalendarSearch aria-hidden className="size-[18px]" />
            {t.tipsTitle}
          </h2>
          <ul className="divide-y divide-primary-ink/15 text-sm">
            {tips.map((tip) => (
              <li key={tip.bookFrom} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>
                  {t
                    .tip(dayList(tip.bookFrom, tip.bookTo, locale, t.and), tip.length, formatRange(tip.start, tip.end, locale), tip.cost)
                    .map((part, i) =>
                      i % 2 ? (
                        <span key={i} className="font-semibold">
                          {part}
                        </span>
                      ) : (
                        part
                      ),
                    )}
                </span>
                <Link href={`/w/${slug}/book?start=${tip.bookFrom}&end=${tip.bookTo}`} className="btn-secondary px-3 py-1 text-sm">
                  {t.bookIt}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="flex flex-wrap justify-between gap-2 pt-1 text-xs text-muted">
        <span>
          {workspace.name} · {t.holidayRegionNote}
        </span>
        <span>{t.datesIn(workspace.timezone)}</span>
      </p>
    </div>
  );
}

/** "Fri 16 Oct" or "Mon 12 and Tue 13 Oct" ("Mo., 12. und Di., 13. Okt."). */
function dayList(from: string, to: string, locale: Locale, and: string) {
  const opts = { weekday: "short", day: "numeric", month: "short" } as const;
  if (from === to) return formatDate(from, opts, locale);
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  return `${formatDate(from, sameMonth ? { weekday: "short", day: "numeric" } : opts, locale)} ${and} ${formatDate(to, opts, locale)}`;
}
