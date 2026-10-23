import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { AllowanceCard } from "@/components/allowance-card";
import { StatusBadge, TypeDot, typeLabel } from "@/components/badges";
import { halfDayLabel } from "@/lib/booking-days";
import { allowanceSummary, leaveTypeUsage, spanOf, withDays } from "@/lib/bookings";
import { formatDate, formatRange, fromISO, toISO, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { can } from "@/lib/permissions";
import { requireMembership, settingsOf } from "@/lib/session";
import { cancelBookingAction, restoreBookingAction } from "../book/actions";
import { canRestore } from "@/lib/undo";
import { CopyField } from "@/components/copy-field";
import { EmptyState } from "@/components/ui";
import { appOrigin } from "@/lib/url";
import { disableCalendarFeedAction, resetCalendarFeedAction, setAwayAction } from "./actions";

export async function generateMetadata() {
  return { title: (await getMessages()).me.title };
}

export default async function MyTimeOffPage({
  params,
}: PageProps<"/w/[slug]/me">) {
  const { slug } = await params;
  const { workspace, membership } = await requireMembership(slug);
  const locale = await getLocale();
  const { common, me: t } = await getMessages();
  const settings = settingsOf(workspace);
  const today = todayIn(workspace.timezone);
  const year = Number(today.slice(0, 4));

  const [summary, nextYear, saved, typeUsed, ownAllowanceTypes, covering] = await Promise.all([
    allowanceSummary(membership, settings, year, undefined, today),
    allowanceSummary(membership, settings, year + 1, undefined, today),
    db.booking.findMany({
      where: { membershipId: membership.id },
      include: {
        decidedBy: { select: { name: true, email: true } },
        leaveType: { select: { name: true, color: true } },
        standIn: { select: { user: { select: { name: true, email: true } } } },
      },
      // Same-day half days: afternoon sorts first here, so the reversed upcoming list shows morning first.
      orderBy: [{ startDate: "desc" }, { startPart: "desc" }],
      take: 100,
    }),
    leaveTypeUsage(workspace.id, year, [membership.id]),
    // Leave types with their own days per year (#34).
    db.leaveType.findMany({ where: { workspaceId: workspace.id, allowanceDays: { not: null }, archivedAt: null }, orderBy: { createdAt: "asc" } }),
    // Colleagues' approved time off where this person is the stand-in (#34), from today on.
    db.booking.findMany({
      where: { standInId: membership.id, status: "APPROVED", endDate: { gte: fromISO(today) }, membership: { removedAt: null } },
      select: { id: true, startDate: true, endDate: true, membership: { select: { user: { select: { name: true, email: true } } } } },
      orderBy: { startDate: "asc" },
      take: 20,
    }),
  ]);
  // Counted like the allowance card above, so the list and "days left" agree.
  const bookings = await withDays(
    workspace.id,
    settings,
    saved.map((b) => ({ ...b, membership })),
  );
  const feedUrl = membership.calendarToken
    ? `${await appOrigin()}/api/calendar/${membership.calendarToken}.ics`
    : null;
  const upcoming = bookings
    .filter((b) => b.endDate >= fromISO(today))
    .reverse();
  const past = bookings.filter((b) => b.endDate < fromISO(today));
  const awayUntil = membership.awayUntil && toISO(membership.awayUntil) >= today ? toISO(membership.awayUntil) : null;

  const row = (b: (typeof bookings)[number], editable: boolean) => {
    const span = spanOf(b);
    const half = halfDayLabel(span, locale);
    const active = b.status === "PENDING" || b.status === "APPROVED";
    return (
      <li
        key={b.id}
        className="flex flex-wrap items-center justify-between gap-2 py-2"
      >
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <TypeDot type={b.type} locale={locale} leaveType={b.leaveType} />
            <span className="font-medium">
              {formatRange(span.start, span.end, locale)}
            </span>
            <StatusBadge status={b.status} locale={locale} />
          </div>
          <div className="text-sm text-muted">
            {typeLabel(b.type, locale, b.specialReason, b.leaveType)} ·{" "}
            {common.days(formatNumber(b.days, locale))}
            {half && ` · ${half}`}
            {b.standIn && ` · ${common.standIn(b.standIn.user.name ?? b.standIn.user.email)}`}
            {b.note && ` · ${b.note}`}
            {b.decisionNote && ` · ${t.adminNote(b.decisionNote)}`}
          </div>
        </div>
        {editable &&
          b.status === "CANCELLED" &&
          !b.cancelReason &&
          canRestore(b.cancelledAt) && (
            <ActionForm action={restoreBookingAction.bind(null, slug, b.id)}>
              <button className="btn-secondary px-3 py-1 text-sm">
                {t.restore}
              </button>
            </ActionForm>
          )}
        {editable && active && (
          <div className="flex items-center gap-3 text-sm">
            <Link
              href={`/w/${slug}/book/${b.id}`}
              className="btn-secondary px-3 py-1"
            >
              {t.change}
            </Link>
            <ActionForm
              action={cancelBookingAction.bind(null, slug, b.id)}
              confirm={t.cancelConfirm}
            >
              <button className="rounded-lg px-2 py-1 text-danger hover:bg-red-500/10">
                {t.cancel}
              </button>
            </ActionForm>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <AllowanceCard
          summary={summary}
          locale={locale}
          editHref={
            membership.role === "ADMIN"
              ? `/w/${slug}/members#member-${membership.id}`
              : undefined
          }
        />
        {(nextYear.used > 0 || nextYear.pending > 0) && (
          <AllowanceCard summary={nextYear} locale={locale} />
        )}
        {ownAllowanceTypes.length > 0 && (
          <section className="card space-y-2">
            <h2 className="font-medium">{t.otherAllowances(year)}</h2>
            <ul className="space-y-1.5 text-sm">
              {ownAllowanceTypes.map((l) => (
                <li key={l.id} className="flex items-center gap-2">
                  <TypeDot type="OTHER" leaveType={l} decorative locale={locale} />
                  <span className="flex-1">{l.name}</span>
                  <span className="text-muted">
                    {t.typeUsed(formatNumber(typeUsed[membership.id]?.[l.id] ?? 0, locale), formatNumber(Number(l.allowanceDays), locale))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <section className="card space-y-2">
        <h2 className="font-medium">{t.upcoming}</h2>
        {upcoming.length === 0 ? (
          <EmptyState icon="🏝️">
            {t.nothingPlanned}{" "}
            {can(membership.role, "bookings:own") && (
              <Link
                href={`/w/${slug}/book`}
                className="font-medium text-primary hover:underline"
              >
                {t.bookTimeOff}
              </Link>
            )}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {upcoming.map((b) => row(b, true))}
          </ul>
        )}
      </section>

      {covering.length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-medium">{t.covering}</h2>
          <ul className="divide-y divide-border text-sm">
            {covering.map((c) => (
              <li key={c.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="font-medium">{c.membership.user.name ?? c.membership.user.email}</span>
                <span className="text-muted">{formatRange(toISO(c.startDate), toISO(c.endDate), locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="font-medium">{t.feedTitle}</h2>
        {feedUrl ? (
          <>
            <p className="text-sm text-muted">{t.feedBody}</p>
            <CopyField value={feedUrl} />
            <div className="flex gap-4 text-sm">
              <ActionForm
                action={resetCalendarFeedAction.bind(null, slug)}
                confirm={t.newLinkConfirm}
              >
                <button className="underline">{t.newLink}</button>
              </ActionForm>
              <ActionForm action={disableCalendarFeedAction.bind(null, slug)}>
                <button className="text-danger underline">
                  {t.turnOff}
                </button>
              </ActionForm>
            </div>
          </>
        ) : (
          <ActionForm
            action={resetCalendarFeedAction.bind(null, slug)}
            className="flex flex-wrap items-center gap-3"
          >
            <p className="text-sm text-muted">{t.feedPitch}</p>
            <button className="btn">{t.getLink}</button>
          </ActionForm>
        )}
      </section>

      {can(membership.role, "bookings:decide") && (
        <section className="card space-y-3" id="away">
          <h2 className="font-medium">{t.awayTitle}</h2>
          <p className="text-sm text-muted">{t.awayHint}</p>
          {awayUntil && <p className="text-sm font-medium">{t.awayNow(formatDate(awayUntil, { day: "numeric", month: "long", year: "numeric" }, locale))}</p>}
          <ActionForm action={setAwayAction.bind(null, slug)} className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-sm">
              <span className="block">{t.awayUntil}</span>
              <input type="date" name="awayUntil" min={today} defaultValue={awayUntil ?? ""} className="input" />
            </label>
            <button className="btn">{t.awaySave}</button>
          </ActionForm>
          {awayUntil && (
            <ActionForm action={setAwayAction.bind(null, slug)}>
              <input type="hidden" name="awayUntil" value="" />
              <button className="text-sm underline">{t.awayClear}</button>
            </ActionForm>
          )}
        </section>
      )}

      {past.length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-medium">{t.past}</h2>
          <ul className="divide-y divide-border opacity-80">
            {past.map((b) => row(b, false))}
          </ul>
        </section>
      )}
    </div>
  );
}
