import { Check, ChevronLeft, ChevronRight, Circle, Clock3 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AloneHint } from "@/components/alone-hint";
import { StatusBadge, TypeDot, typeLabel } from "@/components/badges";
import { ScrollToToday } from "@/components/scroll-to-today";
import { Avatar, SampleBadge } from "@/components/ui";
import { portionOn } from "@/lib/booking-days";
import { activeBookingsBetween, forViewer, regionOf, spanOf, withDays } from "@/lib/bookings";
import { addDays, eachDay, formatDate, fromISO, isISODate, isoWeekday, isWeekend, toISO, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { holidayName } from "@/lib/holidays";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { can } from "@/lib/permissions";
import { requireMembership, settingsOf } from "@/lib/session";
import { peopleOff } from "@/lib/staffing";

const WEEKS = 2;
const PERIOD = WEEKS * 7;

const mondayOf = (iso: string) => addDays(iso, 1 - isoWeekday(iso));

/** "2 weeks | Month" switch shared by both calendar views. */
export function ViewToggle({ slug, view, month, labels }: { slug: string; view: "weeks" | "month"; month: string; labels: { group: string; weeks: string; month: string } }) {
  const item = (active: boolean) =>
    `inline-flex min-h-10 items-center rounded-[7px] px-3 text-xs font-semibold ${active ? "bg-primary-soft text-primary-ink" : "text-muted hover:text-foreground"}`;
  return (
    <div role="group" aria-label={labels.group} className="inline-flex gap-1 rounded-[10px] border border-border bg-surface p-0.5">
      <Link href={`/w/${slug}/calendar`} aria-current={view === "weeks" ? "page" : undefined} className={item(view === "weeks")}>
        {labels.weeks}
      </Link>
      <Link href={`/w/${slug}/calendar?view=month&month=${month}`} aria-current={view === "month" ? "page" : undefined} className={item(view === "month")}>
        {labels.month}
      </Link>
    </div>
  );
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export async function TeamWeeks({ slug, query }: { slug: string; query: Record<string, string | string[] | undefined> }) {
  const { workspace, membership } = await requireMembership(slug);
  const locale = await getLocale();
  const { common, calendar: t } = await getMessages();
  const settings = settingsOf(workspace);
  const today = todayIn(workspace.timezone);
  const isAdmin = membership.role === "ADMIN";

  const from = mondayOf(typeof query.from === "string" && isISODate(query.from) ? query.from : today);
  const days = eachDay(from, addDays(from, PERIOD - 1));
  const last = days[days.length - 1];
  const selected = typeof query.day === "string" && days.includes(query.day) ? query.day : days.includes(today) ? today : from;

  const [members, rawBookings, holidayRows] = await Promise.all([
    db.membership.findMany({
      where: { workspaceId: workspace.id, removedAt: null },
      include: { user: { select: { name: true, email: true } } },
    }),
    activeBookingsBetween(workspace.id, from, last).then((bs) => forViewer(bs, { membershipId: membership.id, role: membership.role })),
    db.holiday.findMany({ where: { workspaceId: workspace.id, date: { gte: fromISO(from), lte: fromISO(last) } } }),
  ]);
  const bookings = await withDays(workspace.id, settings, rawBookings);

  const label = (m: (typeof members)[number]) => m.user.name ?? m.user.email;
  members.sort((a, b) => (a.id === membership.id ? -1 : b.id === membership.id ? 1 : label(a).localeCompare(label(b))));

  const holidayOn = (d: string, region: string) => {
    const h = holidayRows.find((h) => toISO(h.date) === d && (h.region === "" || h.region === region));
    return h && holidayName(h, locale);
  };
  const offDay = (d: string, region = "") => isWeekend(d) || !!holidayOn(d, region);

  // Staffing counts confirmed time off; pending requests show as "n*" (the number if they were approved).
  const spans = (list: typeof bookings) => list.map((b) => ({ ...spanOf(b), membershipId: b.membershipId }));
  const confirmed = spans(bookings.filter((b) => b.status === "APPROVED"));
  const everything = spans(bookings);
  const inOn = (d: string, list = confirmed) => Math.max(0, members.length - peopleOff(list, d));
  const min = settings.minPeoplePresent;
  const anyPending = days.some((d) => inOn(d, everything) !== inOn(d));

  const href = (opts: { from?: string; day?: string }) => `/w/${slug}/calendar?from=${opts.from ?? from}&day=${opts.day ?? selected}`;
  const periodLabel = (start: string, end: string) =>
    `${formatDate(start, { day: "numeric", month: start.slice(5, 7) === end.slice(5, 7) ? undefined : "long" }, locale)}–${formatDate(end, { day: "numeric", month: "long" }, locale)}`;
  const monthLabel = formatDate(addDays(from, 7), { month: "long", year: "numeric" }, locale);
  const dayLong = (d: string) => formatDate(d, { weekday: "long", day: "numeric", month: "long" }, locale);

  const sel = {
    in: inOn(selected),
    away: bookings.filter((b) => portionOn(spanOf(b), selected) && b.status !== "CANCELLED"),
  };
  const awayIds = new Set(sel.away.map((b) => b.membershipId));
  const selectedHolidayOff = offDay(selected);
  const state = min === null ? "none" : sel.in < min ? "below" : sel.in === min ? "min" : "ok";

  const arrow = "inline-flex size-10 items-center justify-center rounded-[9px] border border-border bg-surface text-foreground hover:bg-surface-muted [&_svg]:size-[18px]";

  return (
    <div className="space-y-6">
      {members.length === 1 && <AloneHint slug={slug} isAdmin={isAdmin} />}
      <div className="space-y-1.5">
        <h1 className="text-[28px] leading-tight font-normal tracking-tight sm:text-[32px]">{t.heading}</h1>
        <p className="text-[15px] text-muted">{t.subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <Link href={href({ from: addDays(from, -PERIOD) })} aria-label={t.previousPeriod} className={arrow}>
            <ChevronLeft aria-hidden />
          </Link>
          <h2 className="text-[19px] font-semibold">{monthLabel}</h2>
          <Link href={href({ from: addDays(from, PERIOD) })} aria-label={t.nextPeriod} className={arrow}>
            <ChevronRight aria-hidden />
          </Link>
          {!days.includes(today) && (
            <Link href={`/w/${slug}/calendar`} className="inline-flex min-h-10 items-center text-[13px] font-semibold text-primary-ink hover:underline">
              {t.today}
            </Link>
          )}
        </div>
        <ViewToggle slug={slug} view="weeks" month={from.slice(0, 7)} labels={{ group: t.viewLabel, weeks: t.twoWeeks, month: t.month }} />
      </div>

      <ScrollToToday className="overflow-x-auto overscroll-x-contain rounded-[18px] border border-border bg-surface p-3 sm:p-5">
        <table className="w-full min-w-[1008px] table-fixed border-collapse sm:min-w-[1116px]">
          <colgroup>
            <col className="w-28 sm:w-[220px]" />
            {days.map((d) => (
              <col key={d} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" data-sticky className="sticky left-0 z-10 bg-surface pr-2 pb-2 text-left align-bottom text-[11px] font-semibold tracking-wide text-muted">
                {t.people(members.length)}
              </th>
              {[0, 1].map((w) => (
                <th key={w} scope="colgroup" colSpan={7} className="pb-2 text-left align-bottom text-xs font-semibold text-muted">
                  {periodLabel(addDays(from, w * 7), addDays(from, w * 7 + 6))}
                </th>
              ))}
            </tr>
            <tr>
              <th scope="col" className="sticky left-0 z-10 border-b border-border bg-surface pr-2 text-left text-xs font-normal text-muted">
                <span className="hidden sm:inline">{t.member}</span>
              </th>
              {days.map((d) => {
                const isSel = d === selected;
                return (
                  <th
                    key={d}
                    scope="col"
                    data-today={d === today ? "" : undefined}
                    className={`h-[62px] border-b border-border p-0 font-normal ${isSel ? "" : offDay(d) ? "bg-surface-muted" : ""}`}
                  >
                    <Link
                      href={href({ day: d })}
                      aria-label={t.showDay(dayLong(d))}
                      aria-current={isSel ? "date" : undefined}
                      className={`flex h-full flex-col items-center justify-center gap-0.5 rounded-t-lg ${
                        isSel ? "bg-primary text-primary-foreground" : d === today ? "bg-primary-soft text-primary-ink" : "hover:bg-surface-muted"
                      }`}
                    >
                      <span aria-hidden className={`text-[10px] uppercase ${isSel ? "" : "text-muted"} ${d === today && !isSel ? "text-primary-ink" : ""}`}>
                        {formatDate(d, { weekday: "short" }, locale)}
                      </span>
                      <span aria-hidden className="text-lg leading-none font-semibold">
                        {Number(d.slice(8))}
                      </span>
                    </Link>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr className="h-[54px]">
              <th scope="row" className="sticky left-0 z-10 border-b border-border bg-surface pr-2 text-left">
                <span className="block text-xs font-semibold">{t.peopleIn(min)}</span>
                <span className="hidden text-[10px] font-normal text-muted sm:block">{t.approvedDeducted}</span>
              </th>
              {days.map((d) => {
                const n = inOn(d);
                const atMin = min !== null && n <= min && !offDay(d);
                const pendingChange = !offDay(d) && inOn(d, everything) !== n;
                return (
                  <td
                    key={d}
                    className={`border-b border-border text-center text-sm ${
                      d === selected ? "bg-primary-soft" : offDay(d) ? "bg-surface-muted" : ""
                    } ${atMin ? (n < (min ?? 0) ? "font-semibold text-danger" : "text-primary-ink") : "text-muted"}`}
                  >
                    {offDay(d) ? (
                      "—"
                    ) : (
                      <>
                        {fmt(n)}
                        {pendingChange && <span aria-hidden>*</span>}
                        {atMin && <span className="block text-[8px] leading-none uppercase">{t.atMin}</span>}
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
            {members.map((m) => {
              const own = bookings.filter((b) => b.membershipId === m.id);
              const canBook = m.id === membership.id ? can(membership.role, "bookings:own") : can(membership.role, "bookings:manage-all");
              const region = regionOf(m, settings);
              // One pill per booking, drawn from its first visible day across all the days it covers.
              const pills = own.flatMap((b) => {
                const span = spanOf(b);
                const hits = days.map((d, i) => ({ i, p: portionOn(span, d) })).filter((h) => h.p);
                if (hits.length === 0) return [];
                const first = hits[0];
                const end = hits[hits.length - 1];
                const left = first.p === "PM" ? 0.5 : 0;
                const right = end.p === "AM" ? 0.5 : 0;
                return [{ b, index: first.i, left, width: end.i - first.i + 1 - left - right }];
              });
              return (
                <tr key={m.id} className="h-16">
                  <th scope="row" className="sticky left-0 z-10 border-b border-border bg-surface p-0 pr-2 text-left font-normal">
                    <span className="flex items-center gap-2.5 sm:px-3">
                      <Avatar label={label(m)} className="max-sm:hidden size-8 text-xs" />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold">
                          {label(m)}
                          {m.id === membership.id && <span className="font-normal text-muted">{t.you}</span>}
                        </span>
                        {m.isSample && <SampleBadge label={common.sample} className="ml-0" />}
                      </span>
                    </span>
                  </th>
                  {days.map((d, i) => {
                    const busy = own.some((b) => portionOn(spanOf(b), d));
                    const holiday = holidayOn(d, region);
                    const here = pills.filter((p) => p.index === i);
                    return (
                      <td
                        key={d}
                        title={holiday ? t.holiday(holiday) : undefined}
                        className={`relative border-r border-b border-border p-0 ${
                          d === selected ? "bg-primary-soft" : offDay(d, region) ? "bg-surface-muted" : ""
                        }`}
                      >
                        {!busy && canBook && (
                          <Link
                            href={`/w/${slug}/book?start=${d}${m.id !== membership.id ? `&member=${m.id}` : ""}`}
                            className="block h-16 hover:bg-primary-soft"
                            aria-label={t.bookDay(d, label(m))}
                          />
                        )}
                        {here.map(({ b, left, width }) => {
                          const pending = b.status === "PENDING";
                          const vacation = b.type === "VACATION";
                          const style = { left: `calc(${left * 100}% + 3px)`, width: `calc(${width * 100}% - 6px)` };
                          const name = typeLabel(b.type, locale, b.specialReason, b.leaveType);
                          const title =
                            t.booking(label(m), name, null, pending) +
                            (b.standIn ? ` · ${common.standIn(b.standIn.user.name ?? b.standIn.user.email)}` : "") +
                            (b.note ? ` – ${b.note}` : "");
                          const body: ReactNode = (
                            <>
                              {pending ? (
                                <Clock3 aria-hidden className="size-3 shrink-0" strokeWidth={2.5} />
                              ) : vacation ? (
                                <Check aria-hidden className="size-3 shrink-0" strokeWidth={2.5} />
                              ) : (
                                <TypeDot type={b.type} decorative locale={locale} leaveType={b.leaveType} />
                              )}
                              <span className="truncate">
                                {fmt(b.days)}
                                {locale === "de" ? "T" : "d"}
                                {" · "}
                                {vacation ? common.status[b.status] : name}
                              </span>
                            </>
                          );
                          const cls = `absolute top-4 z-[1] flex h-8 items-center gap-1.5 overflow-hidden rounded-[7px] border px-2 text-[11px] font-semibold ${
                            pending
                              ? "border-dashed border-warning/50 bg-warning-soft text-warning"
                              : vacation
                                ? "border-success bg-success-soft text-success"
                                : "border-border bg-surface-muted text-foreground"
                          }`;
                          return canBook ? (
                            <Link key={b.id} href={`/w/${slug}/book/${b.id}`} aria-label={t.changeBooking(label(m), d)} title={title} style={style} className={cls}>
                              {body}
                            </Link>
                          ) : (
                            <span key={b.id} title={title} style={style} className={cls}>
                              {body}
                            </span>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-[11px] text-muted">
          <div className="flex flex-wrap items-center gap-4">
            <StatusBadge status="APPROVED" locale={locale} />
            <StatusBadge status="PENDING" locale={locale} />
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block size-3 border border-border bg-surface-muted" />
              {t.nonWorking}
            </span>
          </div>
          {anyPending && <span>{t.ifApproved}</span>}
        </div>
      </ScrollToToday>

      <section aria-label={dayLong(selected)} className="grid gap-6 rounded-[18px] border border-border bg-surface p-5 sm:p-6 md:grid-cols-[minmax(0,254px)_minmax(0,1fr)_minmax(0,1fr)] md:gap-8">
        <div className="space-y-2.5">
          <h2 className="text-lg">{dayLong(selected)}</h2>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-[28px] leading-tight">{selectedHolidayOff ? "—" : t.inOf(fmt(sel.in), members.length)}</p>
            {!selectedHolidayOff && state !== "none" && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ${
                  state === "below" ? "bg-danger-soft text-danger" : state === "min" ? "bg-surface-muted text-muted" : "bg-success-soft text-success"
                }`}
              >
                {state === "ok" ? <Check aria-hidden className="size-3" strokeWidth={2.5} /> : <Circle aria-hidden className="size-3" strokeWidth={2.5} />}
                {state === "below" ? t.belowMinimum : state === "min" ? t.atMinimum : t.covered}
              </span>
            )}
          </div>
          {!selectedHolidayOff && min !== null && (
            <p className="text-xs text-muted">{state === "below" ? t.below : state === "min" ? t.noSpare : t.spare(Math.floor(sel.in - min))}</p>
          )}
        </div>
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted">{t.away(sel.away.length)}</h3>
          {sel.away.length === 0 && <p className="text-sm text-muted">{t.nobodyAway}</p>}
          {sel.away.map((b) => {
            const name = b.membership.user.name ?? b.membership.user.email;
            return (
              <div key={b.id} className="flex items-center gap-3">
                <Avatar label={name} className="size-9 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{name}</p>
                  <p className="text-xs text-muted">
                    {formatDate(toISO(b.startDate), undefined, locale)}
                    {toISO(b.startDate) !== toISO(b.endDate) && ` – ${formatDate(toISO(b.endDate), undefined, locale)}`} · {t.dayCount(fmt(b.days))}
                  </p>
                </div>
                <StatusBadge status={b.status} locale={locale} />
              </div>
            );
          })}
        </div>
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted">{t.inTeam(members.filter((m) => !awayIds.has(m.id)).length)}</h3>
          <p className="text-sm">
            {members
              .filter((m) => !awayIds.has(m.id))
              .map(label)
              .join(" · ")}
          </p>
          <p className="text-[11px] text-muted">{t.zone(workspace.timezone)}</p>
        </div>
      </section>
      <p className="text-xs text-muted">{t.selectHint}</p>
    </div>
  );
}
