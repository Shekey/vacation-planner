import Link from "next/link";
import { AllowanceCard } from "@/components/allowance-card";
import { TypeDot, typeLabel } from "@/components/badges";
import { halfDayLabel, portionOn } from "@/lib/booking-days";
import { activeBookingsBetween, allowanceSummary, spanOf } from "@/lib/bookings";
import { addDays, formatRange, fromISO, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireMembership, settingsOf } from "@/lib/session";

export default async function OverviewPage({ params }: PageProps<"/w/[slug]">) {
  const { slug } = await params;
  const { workspace, membership } = await requireMembership(slug);
  const settings = settingsOf(workspace);
  const today = todayIn(workspace.timezone);
  const horizon = addDays(today, 14);

  const [bookings, summary, pendingCount, myUpcoming] = await Promise.all([
    activeBookingsBetween(workspace.id, today, horizon),
    allowanceSummary(membership, settings, Number(today.slice(0, 4))),
    membership.role === "ADMIN" && settings.approvalsEnabled
      ? db.booking.count({ where: { workspaceId: workspace.id, status: "PENDING" } })
      : 0,
    db.booking.count({
      where: { membershipId: membership.id, status: { in: ["PENDING", "APPROVED"] }, endDate: { gte: fromISO(today) } },
    }),
  ]);

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

      <AllowanceCard summary={summary} />

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
