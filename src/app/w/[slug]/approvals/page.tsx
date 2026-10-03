import { ActionForm } from "@/components/action-form";
import { TypeDot, typeLabel } from "@/components/badges";
import { Avatar, EmptyState } from "@/components/ui";
import { halfDayLabel, portionOn } from "@/lib/booking-days";
import { activeBookingsBetween, allowanceSummary, loadHolidays, spanOf } from "@/lib/bookings";
import { eachDay, formatDate, formatRange, todayIn } from "@/lib/dates";
import { understaffedDays } from "@/lib/staffing";
import { db } from "@/lib/db";
import { requireAdmin, settingsOf } from "@/lib/session";
import { decideAction } from "./actions";

export const metadata = { title: "Approvals" };

export default async function ApprovalsPage({ params }: PageProps<"/w/[slug]/approvals">) {
  const { slug } = await params;
  const { workspace } = await requireAdmin(slug);
  const settings = settingsOf(workspace);
  const year = Number(todayIn(workspace.timezone).slice(0, 4));

  const pending = await db.booking.findMany({
    where: { workspaceId: workspace.id, status: "PENDING", membership: { removedAt: null } },
    include: { membership: { include: { user: { select: { name: true, email: true } } } } },
    orderBy: { startDate: "asc" },
  });

  // Staffing counts use the team's main region; each person's own allowance uses theirs.
  const holidays = await loadHolidays(workspace.id, settings.holidayRegion ?? "");
  const memberCount = await db.membership.count({ where: { workspaceId: workspace.id, removedAt: null } });
  const rows = await Promise.all(
    pending.map(async (b) => {
      const span = spanOf(b);
      const [summary, others] = await Promise.all([
        allowanceSummary(b.membership, settings, Number(span.start.slice(0, 4)) || year),
        activeBookingsBetween(workspace.id, span.start, span.end),
      ]);
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
    }),
  );

  if (!settings.approvalsEnabled) {
    return <p className="opacity-70">Approvals are turned off for this workspace. Bookings are confirmed right away.</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Waiting for approval</h2>
      {rows.length === 0 ? (
        <EmptyState icon="🎉">You&apos;re all caught up. Nothing is waiting for you.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ b, span, summary, clashes, shortDays }) => {
            const half = halfDayLabel(span);
            return (
              <li key={b.id} className="card space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 font-medium">
                      <Avatar label={b.membership.user.name ?? b.membership.user.email} seed={b.membership.user.email} />
                      {b.membership.user.name ?? b.membership.user.email}
                      <TypeDot type={b.type} />
                    </div>
                    <div className="text-sm">
                      {formatRange(span.start, span.end)} · {Number(b.daysCount)} days · {typeLabel(b.type)}
                      {half && ` · ${half}`}
                    </div>
                    {b.note && <div className="text-sm opacity-70">“{b.note}”</div>}
                  </div>
                  <div className="text-right text-xs opacity-70">
                    {summary.remaining !== null &&
                      `${summary.remaining} of ${summary.allowance} days left in ${summary.year} incl. this`}
                  </div>
                </div>
                {shortDays.length > 0 && (
                  <p className="text-sm text-red-600">
                    Approving leaves only {shortDays[0].present} of {memberCount} in on{" "}
                    {shortDays.slice(0, 3).map((d) => formatDate(d.day)).join(", ")}
                    {shortDays.length > 3 && ` and ${shortDays.length - 3} more day${shortDays.length === 4 ? "" : "s"}`} (minimum {settings.minPeoplePresent}).
                  </p>
                )}
                {clashes.length > 0 && (
                  <p className="text-sm text-amber-700 dark:text-amber-400">Also off then: {clashes.join(", ")}</p>
                )}
                <ActionForm action={decideAction.bind(null, slug, b.id)} className="flex flex-wrap items-center gap-2">
                  <input name="note" className="input min-w-48 flex-1 py-1.5 text-sm" placeholder="Note in the email to them (optional, not saved)" aria-label="Note in the email to them (optional, not saved)" />
                  <button name="decision" value="approve" className="btn py-1.5">
                    Approve
                  </button>
                  <button
                    name="decision"
                    value="reject"
                    className="rounded-lg border border-red-600/60 px-4 py-1.5 font-medium text-red-600 transition-colors hover:bg-red-500/10"
                  >
                    Decline
                  </button>
                </ActionForm>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
