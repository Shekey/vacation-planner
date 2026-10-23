import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { StatusBadge, TypeDot, typeLabel } from "@/components/badges";
import { Avatar, SampleBadge } from "@/components/ui";
import { halfDayLabel } from "@/lib/booking-days";
import { formatDate, formatRange } from "@/lib/dates";
import { formatNumber, type Locale, type Messages } from "@/lib/i18n";
import type { RequestReview } from "@/lib/request-review";

/** One pending request as an approver sees it, on Approvals and on the page an email link opens. */
export function RequestCard({
  review: { b, span, summary, clashes, shortDays },
  memberCount,
  minPeoplePresent,
  locale,
  messages,
  children,
}: {
  review: RequestReview;
  memberCount: number;
  minPeoplePresent: number | null;
  locale: Locale;
  messages: Messages;
  /** The decision buttons. */
  children: ReactNode;
}) {
  const t = messages.approvals;
  const half = halfDayLabel(span, locale);
  const who = b.membership.user.name ?? b.membership.user.email;
  return (
    <div className="space-y-4 rounded-[18px] border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar label={who} className="size-10 text-xs" />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              {who}
              {b.membership.isSample && <SampleBadge label={messages.common.sample} />}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <TypeDot type={b.type} locale={locale} leaveType={b.leaveType} />
              {typeLabel(b.type, locale, b.specialReason, b.leaveType)}
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
            ` · ${t.daysLeft(formatNumber(summary.remaining, locale), formatNumber(summary.allowance ?? 0, locale), summary.year)}`}
        </p>
        {summary.remaining !== null && summary.remaining < 0 && (
          <p className="text-sm font-medium text-danger">{t.overBy(formatNumber(-summary.remaining, locale), summary.year)}</p>
        )}
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
                  minPeoplePresent,
                )}
              </p>
            )}
            {clashes.length > 0 && <p className="text-foreground">{t.alsoOff(clashes.join(", "))}</p>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
