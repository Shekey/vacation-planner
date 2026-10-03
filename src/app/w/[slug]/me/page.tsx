import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { AllowanceCard } from "@/components/allowance-card";
import { StatusBadge, TypeDot, typeLabel } from "@/components/badges";
import { halfDayLabel } from "@/lib/booking-days";
import { allowanceSummary, spanOf } from "@/lib/bookings";
import { formatRange, fromISO, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { requireMembership, settingsOf } from "@/lib/session";
import { cancelBookingAction } from "../book/actions";
import { CopyField } from "@/components/copy-field";
import { EmptyState } from "@/components/ui";
import { appOrigin } from "@/lib/url";
import { disableCalendarFeedAction, resetCalendarFeedAction } from "./actions";

export async function generateMetadata() {
  return { title: (await getMessages()).me.title };
}

export default async function MyTimeOffPage({ params }: PageProps<"/w/[slug]/me">) {
  const { slug } = await params;
  const { workspace, membership } = await requireMembership(slug);
  const locale = await getLocale();
  const { common, me: t } = await getMessages();
  const settings = settingsOf(workspace);
  const today = todayIn(workspace.timezone);
  const year = Number(today.slice(0, 4));

  const [summary, nextYear, bookings] = await Promise.all([
    allowanceSummary(membership, settings, year),
    allowanceSummary(membership, settings, year + 1),
    db.booking.findMany({
      where: { membershipId: membership.id },
      include: { decidedBy: { select: { name: true, email: true } } },
      // Same-day half days: afternoon sorts first here, so the reversed upcoming list shows morning first.
      orderBy: [{ startDate: "desc" }, { startPart: "desc" }],
      take: 100,
    }),
  ]);
  const feedUrl = membership.calendarToken ? `${await appOrigin()}/api/calendar/${membership.calendarToken}.ics` : null;
  const upcoming = bookings.filter((b) => b.endDate >= fromISO(today)).reverse();
  const past = bookings.filter((b) => b.endDate < fromISO(today));

  const row = (b: (typeof bookings)[number], editable: boolean) => {
    const span = spanOf(b);
    const half = halfDayLabel(span, locale);
    const active = b.status === "PENDING" || b.status === "APPROVED";
    return (
      <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <TypeDot type={b.type} locale={locale} />
            <span className="font-medium">{formatRange(span.start, span.end, locale)}</span>
            <StatusBadge status={b.status} locale={locale} />
          </div>
          <div className="text-sm opacity-70">
            {typeLabel(b.type, locale)} · {common.days(formatNumber(Number(b.daysCount), locale))}
            {half && ` · ${half}`}
            {b.note && ` · ${b.note}`}
            {b.decisionNote && ` · ${t.adminNote(b.decisionNote)}`}
          </div>
        </div>
        {editable && active && (
          <div className="flex items-center gap-3 text-sm">
            <Link href={`/w/${slug}/book/${b.id}`} className="btn-secondary px-3 py-1">
              {t.change}
            </Link>
            <ActionForm action={cancelBookingAction.bind(null, slug, b.id)} confirm={t.cancelConfirm}>
              <button className="rounded-lg px-2 py-1 text-red-600 hover:bg-red-500/10">{t.cancel}</button>
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
          editHref={membership.role === "ADMIN" ? `/w/${slug}/members#member-${membership.id}` : undefined}
        />
        {(nextYear.used > 0 || nextYear.pending > 0) && <AllowanceCard summary={nextYear} locale={locale} />}
      </div>

      <section className="card space-y-2">
        <h2 className="font-medium">{t.upcoming}</h2>
        {upcoming.length === 0 ? (
          <EmptyState icon="🏝️">
            {t.nothingPlanned}{" "}
            <Link href={`/w/${slug}/book`} className="font-medium text-primary hover:underline">
              {t.bookTimeOff}
            </Link>
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border">{upcoming.map((b) => row(b, true))}</ul>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-medium">{t.feedTitle}</h2>
        {feedUrl ? (
          <>
            <p className="text-sm opacity-70">{t.feedBody}</p>
            <CopyField value={feedUrl} />
            <div className="flex gap-4 text-sm">
              <ActionForm action={resetCalendarFeedAction.bind(null, slug)} confirm={t.newLinkConfirm}>
                <button className="underline">{t.newLink}</button>
              </ActionForm>
              <ActionForm action={disableCalendarFeedAction.bind(null, slug)}>
                <button className="text-red-600 underline">{t.turnOff}</button>
              </ActionForm>
            </div>
          </>
        ) : (
          <ActionForm action={resetCalendarFeedAction.bind(null, slug)} className="flex flex-wrap items-center gap-3">
            <p className="text-sm opacity-70">{t.feedPitch}</p>
            <button className="btn">{t.getLink}</button>
          </ActionForm>
        )}
      </section>

      {past.length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-medium">{t.past}</h2>
          <ul className="divide-y divide-border opacity-80">{past.map((b) => row(b, false))}</ul>
        </section>
      )}
    </div>
  );
}
