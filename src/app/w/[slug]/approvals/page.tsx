import { ActionForm } from "@/components/action-form";
import { TypeDot, typeLabel } from "@/components/badges";
import { halfDayLabel, portionOn } from "@/lib/booking-days";
import { activeBookingsBetween, allowanceSummary, spanOf } from "@/lib/bookings";
import { eachDay, formatRange, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireAdmin, settingsOf } from "@/lib/session";
import { decideAction } from "./actions";

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
      return { b, span, summary, clashes };
    }),
  );

  if (!settings.approvalsEnabled) {
    return <p className="opacity-70">Approvals are turned off for this workspace. Bookings are confirmed right away.</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Waiting for approval</h2>
      {rows.length === 0 ? (
        <p className="opacity-70">You&apos;re all caught up. 🎉</p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ b, span, summary, clashes }) => {
            const half = halfDayLabel(span);
            return (
              <li key={b.id} className="card space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 font-medium">
                      <TypeDot type={b.type} />
                      {b.membership.user.name ?? b.membership.user.email}
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
                {clashes.length > 0 && (
                  <p className="text-sm text-amber-700 dark:text-amber-400">Also off then: {clashes.join(", ")}</p>
                )}
                <ActionForm action={decideAction.bind(null, slug, b.id)} className="flex flex-wrap items-center gap-2">
                  <input name="note" className="input min-w-48 flex-1 py-1.5 text-sm" placeholder="Note to them (optional)" />
                  <button name="decision" value="approve" className="btn py-1.5">
                    Approve
                  </button>
                  <button
                    name="decision"
                    value="reject"
                    className="rounded-md border border-red-600 px-4 py-1.5 font-medium text-red-600"
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
