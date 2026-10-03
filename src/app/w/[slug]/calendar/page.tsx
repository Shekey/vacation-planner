import Link from "next/link";
import { Legend, typeColor, typeLabel } from "@/components/badges";
import { ScrollToToday } from "@/components/scroll-to-today";
import { Avatar } from "@/components/ui";
import { portionOn } from "@/lib/booking-days";
import { activeBookingsBetween, forViewer, regionOf, spanOf } from "@/lib/bookings";
import { eachDay, formatDate, fromISO, isWeekend, isYearMonth, monthBounds, shiftMonth, toISO, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { intlLocale } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { requireMembership, settingsOf } from "@/lib/session";
import { holidayName } from "@/lib/holidays";

export async function generateMetadata() {
  return { title: (await getMessages()).calendar.title };
}

export default async function CalendarPage({ params, searchParams }: PageProps<"/w/[slug]/calendar">) {
  const { slug } = await params;
  const query = await searchParams;
  const { workspace, membership } = await requireMembership(slug);
  const locale = await getLocale();
  const { common, calendar: t } = await getMessages();
  const today = todayIn(workspace.timezone);
  const month = isYearMonth(query.month) ? query.month : today.slice(0, 7);
  const { start, end } = monthBounds(month);
  const days = eachDay(start, end);
  const isAdmin = membership.role === "ADMIN";

  const [members, bookings, holidayRows] = await Promise.all([
    db.membership.findMany({
      where: { workspaceId: workspace.id, removedAt: null },
      include: { user: { select: { name: true, email: true } } },
    }),
    activeBookingsBetween(workspace.id, start, end).then((bs) =>
      forViewer(bs, { membershipId: membership.id, role: membership.role }, settingsOf(workspace)),
    ),
    db.holiday.findMany({ where: { workspaceId: workspace.id, date: { gte: fromISO(start), lte: fromISO(end) } } }),
  ]);
  // Nationwide holidays shade the whole column; regional ones only the rows of people in that region.
  const settings = settingsOf(workspace);
  const holidayOn = (d: string, region: string) => {
    const h = holidayRows.find((h) => toISO(h.date) === d && (h.region === "" || h.region === region));
    return h && holidayName(h, locale);
  };
  const offDayClass = (d: string, region = "") =>
    holidayOn(d, region) ? "bg-rose-500/10" : isWeekend(d) ? "bg-black/5 dark:bg-white/5" : "";
  // You first, then everyone else alphabetically.
  const label = (m: (typeof members)[number]) => m.user.name ?? m.user.email;
  members.sort((a, b) => (a.id === membership.id ? -1 : b.id === membership.id ? 1 : label(a).localeCompare(label(b))));

  const byMember = new Map<string, typeof bookings>();
  for (const b of bookings) byMember.set(b.membershipId, [...(byMember.get(b.membershipId) ?? []), b]);

  const monthLabel = new Intl.DateTimeFormat(intlLocale(locale), { month: "long", year: "numeric", timeZone: "UTC" }).format(
    fromISO(start),
  );
  const nav = (m: string) => `/w/${slug}/calendar?month=${m}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={nav(shiftMonth(month, -1))} className="btn-secondary px-2.5 py-1" aria-label={t.previousMonth}>
            ←
          </Link>
          <h2 className="min-w-40 text-center text-lg font-semibold">{monthLabel}</h2>
          <Link href={nav(shiftMonth(month, 1))} className="btn-secondary px-2.5 py-1" aria-label={t.nextMonth}>
            →
          </Link>
          {month !== today.slice(0, 7) && (
            <Link href={nav(today.slice(0, 7))} className="text-sm text-primary hover:underline">
              {t.today}
            </Link>
          )}
        </div>
        <Legend locale={locale} />
      </div>

      <ScrollToToday className="overflow-x-auto overscroll-x-contain rounded-xl border border-border bg-surface shadow-sm">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th
                scope="col"
                data-sticky
                className="sticky left-0 z-10 w-24 min-w-24 max-w-24 bg-surface p-2 text-left font-medium sm:w-auto sm:min-w-28 sm:max-w-40"
              >
                {t.member}
              </th>
              {days.map((d) => (
                <th
                  key={d}
                  scope="col"
                  data-today={d === today ? "" : undefined}
                  title={holidayOn(d, "")}
                  className={`min-w-6 p-1 text-center font-normal ${offDayClass(d)} ${
                    d === today ? "text-sky-600 font-bold dark:text-sky-400" : "opacity-70"
                  }`}
                >
                  <div aria-hidden>{t.weekdayLetters[fromISO(d).getUTCDay()]}</div>
                  <div aria-hidden>{Number(d.slice(8))}</div>
                  <span className="sr-only">{formatDate(d, { weekday: "long", day: "numeric", month: "long" }, locale)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const own = byMember.get(m.id) ?? [];
              const canBook = isAdmin || m.id === membership.id;
              const region = regionOf(m, settings);
              return (
                <tr key={m.id} className="border-t border-black/5 dark:border-white/10">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 w-24 min-w-24 max-w-24 truncate bg-surface p-2 text-left font-medium sm:w-auto sm:min-w-28 sm:max-w-40"
                  >
                    <span className="flex items-center gap-1.5">
                      <Avatar label={label(m)} seed={m.user.email} className="hidden size-5 text-[9px] sm:inline-grid" />
                      <span className="truncate">
                        {label(m)}
                        {m.id === membership.id && <span className="font-normal opacity-60">{t.you}</span>}
                      </span>
                    </span>
                  </th>
                  {days.map((d) => {
                    // Up to two bookings can share a day (a morning and an afternoon).
                    const hits = own
                      .map((b) => ({ b, portion: portionOn(spanOf(b), d) }))
                      .filter((h): h is { b: (typeof own)[number]; portion: "FULL" | "AM" | "PM" } => h.portion !== null);
                    const weekendClass = offDayClass(d, region);
                    const holiday = holidayOn(d, region);
                    const todayClass = d === today && !weekendClass ? "bg-primary/[0.07]" : "";
                    const title = hits
                      .map(
                        ({ b, portion }) =>
                          `${t.booking(label(m), typeLabel(b.type, locale), portion !== "FULL" ? common.dayPart[portion] : null, b.status === "PENDING")}${
                            b.note ? ` – ${b.note}` : ""
                          }`,
                      )
                      .concat(holiday ? [t.holiday(holiday)] : [])
                      .join("\n");
                    return (
                      <td key={d} title={title || undefined} className={`relative h-8 p-0 ${weekendClass} ${todayClass}`}>
                        {hits.length === 0 && canBook && (
                          <Link
                            href={`/w/${slug}/book?start=${d}${m.id !== membership.id ? `&member=${m.id}` : ""}`}
                            className="block h-8 hover:bg-sky-500/10"
                            aria-label={t.bookDay(d, label(m))}
                          />
                        )}
                        {title && <span className="sr-only">{title}</span>}
                        {hits.map(({ b, portion }) => {
                          const block = (
                            <div
                              className={`absolute top-1.5 h-5 ${typeColor(b.type)} ${
                                b.status === "PENDING" ? "pending-stripes opacity-70" : ""
                              } ${portion === "AM" ? "left-0 right-1/2" : portion === "PM" ? "left-1/2 right-0" : "inset-x-0"}`}
                            />
                          );
                          return canBook ? (
                            <Link key={b.id} href={`/w/${slug}/book/${b.id}`} aria-label={t.changeBooking(label(m), d)}>
                              {block}
                            </Link>
                          ) : (
                            <span key={b.id}>{block}</span>
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
      </ScrollToToday>
      <p className="text-xs opacity-60">
        {t.hint}
        <span className="sm:hidden">{t.swipe}</span>
      </p>
    </div>
  );
}
