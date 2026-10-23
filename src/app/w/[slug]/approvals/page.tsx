import { AlertTriangle, CalendarDays, Check, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { StatusBadge, TypeDot, typeLabel } from "@/components/badges";
import { Avatar, EmptyState, SampleBadge } from "@/components/ui";
import { halfDayLabel, portionOn } from "@/lib/booking-days";
import {
  activeBookingsBetween,
  allowanceSummaries,
  loadHolidays,
  spanOf,
  withDays,
} from "@/lib/bookings";
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

export default async function ApprovalsPage({
  params,
}: PageProps<"/w/[slug]/approvals">) {
  const { slug } = await params;
  const { workspace } = await requireAdmin(slug);
  const settings = settingsOf(workspace);
  const locale = await getLocale();
  const messages = await getMessages();
  const t = messages.approvals;
  const today = todayIn(workspace.timezone);
  const year = Number(today.slice(0, 4));

  const saved = await db.booking.findMany({
    where: {
      workspaceId: workspace.id,
      status: "PENDING",
      membership: { removedAt: null },
    },
    include: {
      membership: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
    orderBy: { startDate: "asc" },
  });

  // Counted like the allowance shown next to it, not the count stored when the request was made.
  const pending = await withDays(workspace.id, settings, saved);

  // Staffing counts use the team's main region; each person's own allowance uses theirs.
  const holidays = await loadHolidays(
    workspace.id,
    settings.holidayRegion ?? "",
  );
  const memberCount = await db.membership.count({
    where: { workspaceId: workspace.id, removedAt: null },
  });
  // A few queries for all requests together, not a handful per request: the allowance of everyone asking,
  // per year a request starts in, and the team's bookings across all requested days.
  const yearOf = (b: (typeof pending)[number]) =>
    Number(spanOf(b).start.slice(0, 4)) || year;
  const years = [...new Set(pending.map(yearOf))];
  const summaries = new Map(
    await Promise.all(
      years.map(async (y) => {
        const asking = [
          ...new Map(
            pending
              .filter((b) => yearOf(b) === y)
              .map((b) => [b.membershipId, b.membership]),
          ).values(),
        ];
        return [
          y,
          await allowanceSummaries(asking, settings, y, today),
        ] as const;
      }),
    ),
  );
  const spans = pending.map(spanOf);
  const teamBookings =
    pending.length === 0
      ? []
      : await activeBookingsBetween(
          workspace.id,
          spans.reduce(
            (min, x) => (x.start < min ? x.start : min),
            spans[0].start,
          ),
          spans.reduce((max, x) => (x.end > max ? x.end : max), spans[0].end),
        );
  const rows = pending.map((b) => {
    const span = spanOf(b);
    const summary = summaries.get(yearOf(b))!.get(b.membershipId)!;
    const others = teamBookings.filter(
      (o) => spanOf(o).start <= span.end && spanOf(o).end >= span.start,
    );
    const days = eachDay(span.start, span.end);
    const clashes = [
      ...new Set(
        others
          .filter(
            (o) =>
              o.membershipId !== b.membershipId &&
              days.some((d) => portionOn(spanOf(o), d)),
          )
          .map((o) => o.membership.user.name ?? o.membership.user.email),
      ),
    ];
    // Approved bookings only: other pending requests may still be declined.
    const shortDays = understaffedDays({
      candidate: { ...span, membershipId: b.membershipId },
      team: others
        .filter(
          (o) =>
            o.id !== b.id &&
            o.membershipId !== b.membershipId &&
            o.status === "APPROVED",
        )
        .map((o) => ({ ...spanOf(o), membershipId: o.membershipId })),
      memberCount,
      minPresent: settings.minPeoplePresent,
      rules: {
        countWeekends: settings.countWeekends,
        workDays: b.membership.workDays,
        holidays,
      },
    });
    return { b, span, summary, clashes, shortDays };
  });

  if (!settings.approvalsEnabled) {
    return <p className="text-muted">{t.turnedOff}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <p className="text-xs tracking-wide text-muted uppercase">{t.eyebrow}</p>
          <h1 className="text-[28px] leading-tight font-normal tracking-tight sm:text-[32px]">{t.heading}</h1>
          <p className="text-[15px] text-muted">{t.subtitle}</p>
        </div>
        <Link href={`/w/${slug}/calendar`} className="btn-secondary min-h-11 px-4 py-2 text-[13px] text-primary-ink">
          <CalendarDays aria-hidden className="size-4" /> {t.openCalendar}
        </Link>
      </div>
      <p className="inline-flex rounded-[10px] bg-primary-soft px-4 py-2.5 text-[13px] font-semibold text-primary-ink">
        {t.pendingCount(rows.length)}
      </p>
      {rows.length === 0 ? (
        <EmptyState icon="🎉">{t.empty}</EmptyState>
      ) : (
        <ul className="space-y-4">
          {rows.map(({ b, span, summary, clashes, shortDays }) => {
            const half = halfDayLabel(span, locale);
            const who = b.membership.user.name ?? b.membership.user.email;
            return (
              <li key={b.id} className="space-y-4 rounded-[18px] border border-border bg-surface p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar label={who} className="size-10 text-xs" />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        {who}
                        {b.membership.isSample && <SampleBadge label={messages.common.sample} />}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-muted">
                        <TypeDot type={b.type} locale={locale} />
                        {typeLabel(b.type, locale, b.specialReason)}
                        {half && ` · ${half}`}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status="PENDING" locale={locale} />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl">{formatRange(span.start, span.end, locale)}</p>
                  <p className="text-sm text-muted">
                    {messages.common.days(formatNumber(b.days, locale))}
                    {summary.remaining !== null &&
                      ` · ${t.daysLeft(
                        formatNumber(summary.remaining, locale),
                        formatNumber(summary.allowance ?? 0, locale),
                        summary.year,
                      )}`}
                  </p>
                  {b.note && <p className="text-sm text-muted">“{b.note}”</p>}
                </div>
                {(shortDays.length > 0 || clashes.length > 0) && (
                  <div className="flex items-start gap-3 rounded-[10px] bg-warning-soft p-4 text-sm">
                    <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
                    <div className="space-y-1">
                      <p className="font-semibold text-warning">{t.advisory}</p>
                      {shortDays.length > 0 && (
                        <p className="text-foreground">
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
                      {clashes.length > 0 && <p className="text-foreground">{t.alsoOff(clashes.join(", "))}</p>}
                    </div>
                  </div>
                )}
                <ActionForm action={decideAction.bind(null, slug, b.id)} className="flex flex-wrap items-center gap-2">
                  <input name="note" className="input min-w-48 flex-1 py-2 text-sm" placeholder={t.note} aria-label={t.note} />
                  <button name="decision" value="approve" className="btn min-h-11 py-2">
                    <Check aria-hidden className="size-4" /> {t.approve}
                  </button>
                  <button name="decision" value="reject" className="btn-secondary min-h-11 py-2 text-primary-ink">
                    <X aria-hidden className="size-4" /> {t.decline}
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
