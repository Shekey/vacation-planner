import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { TypeDot, typeLabel } from "@/components/badges";
import { Avatar, EmptyState } from "@/components/ui";
import { halfDayLabel, portionOn } from "@/lib/booking-days";
import { activeBookingsBetween, allowanceSummary, loadHolidays, spanOf } from "@/lib/bookings";
import { eachDay, formatDate, formatRange, todayIn } from "@/lib/dates";
import { understaffedDays } from "@/lib/staffing";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { requireAdmin, settingsOf } from "@/lib/session";
import { decideAction } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).approvals.title };
}

export default async function ApprovalsPage({ params }: PageProps<"/w/[slug]/approvals">) {
  const { slug } = await params;
  const { workspace } = await requireAdmin(slug);
  const settings = settingsOf(workspace);
  const locale = await getLocale();
  const messages = await getMessages();
  const t = messages.approvals;
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
    return <p className="opacity-70">{t.turnedOff}</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{t.heading}</h2>
      {rows.length === 0 ? (
        <EmptyState icon="🎉">{t.empty}</EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ b, span, summary, clashes, shortDays }) => {
            const half = halfDayLabel(span, locale);
            return (
              <li key={b.id} className="card space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 font-medium">
                      <Avatar label={b.membership.user.name ?? b.membership.user.email} seed={b.membership.user.email} />
                      {b.membership.user.name ?? b.membership.user.email}
                      <TypeDot type={b.type} locale={locale} />
                    </div>
                    <div className="text-sm">
                      {formatRange(span.start, span.end, locale)} · {messages.common.days(formatNumber(Number(b.daysCount), locale))} ·{" "}
                      {typeLabel(b.type, locale)}
                      {half && ` · ${half}`}
                    </div>
                    {b.note && <div className="text-sm opacity-70">“{b.note}”</div>}
                  </div>
                  <div className="text-right text-xs opacity-70">
                    {summary.remaining !== null &&
                      t.daysLeft(formatNumber(summary.remaining, locale), formatNumber(summary.allowance ?? 0, locale), summary.year)}
                  </div>
                </div>
                {shortDays.length > 0 && (
                  <p className="text-sm text-red-600">
                    {t.understaffed(
                      shortDays[0].present,
                      memberCount,
                      shortDays
                        .slice(0, 3)
                        .map((d) => formatDate(d.day, undefined, locale))
                        .join(", "),
                      Math.max(0, shortDays.length - 3),
                      settings.minPeoplePresent,
                    )}
                  </p>
                )}
                {clashes.length > 0 && <p className="text-sm text-amber-700 dark:text-amber-400">{t.alsoOff(clashes.join(", "))}</p>}
                <ActionForm action={decideAction.bind(null, slug, b.id)} className="flex flex-wrap items-center gap-2">
                  <input name="note" className="input min-w-48 flex-1 py-1.5 text-sm" placeholder={t.note} aria-label={t.note} />
                  <button name="decision" value="approve" className="btn py-1.5">
                    {t.approve}
                  </button>
                  <button
                    name="decision"
                    value="reject"
                    className="rounded-lg border border-red-600/60 px-4 py-1.5 font-medium text-red-600 transition-colors hover:bg-red-500/10"
                  >
                    {t.decline}
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
