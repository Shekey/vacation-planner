import Link from "next/link";
import { Legend, typeColor } from "@/components/badges";
import { portionOn } from "@/lib/booking-days";
import { activeBookingsBetween, spanOf } from "@/lib/bookings";
import { eachDay, fromISO, isWeekend, isYearMonth, monthBounds, shiftMonth, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/session";

export default async function CalendarPage({ params, searchParams }: PageProps<"/w/[slug]/calendar">) {
  const { slug } = await params;
  const query = await searchParams;
  const { workspace, membership } = await requireMembership(slug);
  const today = todayIn(workspace.timezone);
  const month = isYearMonth(query.month) ? query.month : today.slice(0, 7);
  const { start, end } = monthBounds(month);
  const days = eachDay(start, end);
  const isAdmin = membership.role === "ADMIN";

  const [members, bookings] = await Promise.all([
    db.membership.findMany({
      where: { workspaceId: workspace.id, removedAt: null },
      include: { user: { select: { name: true, email: true } } },
    }),
    activeBookingsBetween(workspace.id, start, end),
  ]);
  // You first, then everyone else alphabetically.
  const label = (m: (typeof members)[number]) => m.user.name ?? m.user.email;
  members.sort((a, b) =>
    a.id === membership.id ? -1 : b.id === membership.id ? 1 : label(a).localeCompare(label(b)),
  );

  const byMember = new Map<string, typeof bookings>();
  for (const b of bookings) byMember.set(b.membershipId, [...(byMember.get(b.membershipId) ?? []), b]);

  const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    fromISO(start),
  );
  const nav = (m: string) => `/w/${slug}/calendar?month=${m}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={nav(shiftMonth(month, -1))} className="rounded-md border border-black/20 px-2.5 py-1 dark:border-white/25" aria-label="Previous month">
            ←
          </Link>
          <h2 className="min-w-40 text-center text-lg font-semibold">{monthLabel}</h2>
          <Link href={nav(shiftMonth(month, 1))} className="rounded-md border border-black/20 px-2.5 py-1 dark:border-white/25" aria-label="Next month">
            →
          </Link>
          {month !== today.slice(0, 7) && (
            <Link href={nav(today.slice(0, 7))} className="text-sm underline">
              Today
            </Link>
          )}
        </div>
        <Legend />
      </div>

      <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-28 max-w-40 bg-background p-2 text-left font-medium">Member</th>
              {days.map((d) => (
                <th
                  key={d}
                  className={`min-w-6 p-1 text-center font-normal ${isWeekend(d) ? "bg-black/5 dark:bg-white/5" : ""} ${
                    d === today ? "text-sky-600 font-bold dark:text-sky-400" : "opacity-70"
                  }`}
                >
                  <div>{["S", "M", "T", "W", "T", "F", "S"][fromISO(d).getUTCDay()]}</div>
                  <div>{Number(d.slice(8))}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const own = byMember.get(m.id) ?? [];
              const canBook = isAdmin || m.id === membership.id;
              return (
                <tr key={m.id} className="border-t border-black/5 dark:border-white/10">
                  <th className="sticky left-0 z-10 truncate bg-background p-2 text-left font-medium">
                    {label(m)}
                    {m.id === membership.id && <span className="font-normal opacity-60"> (you)</span>}
                  </th>
                  {days.map((d) => {
                    // Up to two bookings can share a day (a morning and an afternoon).
                    const hits = own
                      .map((b) => ({ b, portion: portionOn(spanOf(b), d) }))
                      .filter((h): h is { b: (typeof own)[number]; portion: "FULL" | "AM" | "PM" } => h.portion !== null);
                    const weekendClass = isWeekend(d) ? "bg-black/5 dark:bg-white/5" : "";
                    const todayClass = d === today ? "ring-1 ring-inset ring-sky-500/60" : "";
                    const title = hits
                      .map(
                        ({ b, portion }) =>
                          `${label(m)}: ${b.type.toLowerCase()}${portion !== "FULL" ? ` (${portion === "AM" ? "morning" : "afternoon"})` : ""}${
                            b.status === "PENDING" ? ", pending" : ""
                          }${b.note ? ` – ${b.note}` : ""}`,
                      )
                      .join("\n");
                    return (
                      <td key={d} title={title || undefined} className={`relative h-8 p-0 ${weekendClass} ${todayClass}`}>
                        {hits.length === 0 && canBook && (
                          <Link
                            href={`/w/${slug}/book?start=${d}${m.id !== membership.id ? `&member=${m.id}` : ""}`}
                            className="block h-8 hover:bg-sky-500/10"
                            aria-label={`Book ${d} for ${label(m)}`}
                          />
                        )}
                        {hits.map(({ b, portion }) => {
                          const block = (
                            <div
                              className={`absolute top-1.5 h-5 ${typeColor(b.type)} ${
                                b.status === "PENDING" ? "pending-stripes opacity-70" : ""
                              } ${portion === "AM" ? "left-0 right-1/2" : portion === "PM" ? "left-1/2 right-0" : "inset-x-0"}`}
                            />
                          );
                          return canBook ? (
                            <Link key={b.id} href={`/w/${slug}/book/${b.id}`} aria-label={`Change ${label(m)}'s booking`}>
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
      </div>
      <p className="text-xs opacity-60">Click an empty day to book it, or a booking to change it.</p>
    </div>
  );
}
