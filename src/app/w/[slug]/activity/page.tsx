import { CalendarCheck2, History } from "lucide-react";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Avatar } from "@/components/ui";
import { formatRange } from "@/lib/dates";
import { intlLocale } from "@/lib/i18n";
import { db } from "@/lib/db";
import { parseBookingDetail } from "@/lib/audit";
import { spanOf } from "@/lib/bookings";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { requireAdmin } from "@/lib/session";
import { restoreCutoff, restoreDaysLeft } from "@/lib/undo";
import { restoreBookingAction } from "../book/actions";

export async function generateMetadata() {
  return { title: (await getMessages()).audit.title };
}

export default async function ActivityPage({ params }: PageProps<"/w/[slug]/activity">) {
  const { slug } = await params;
  const { workspace } = await requireAdmin(slug);
  const locale = await getLocale();
  const t = (await getMessages()).audit;

  const [events, cancelled] = await Promise.all([
    db.auditEvent.findMany({
      where: { workspaceId: workspace.id },
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    // Bookings cancelled because someone was removed come back with that person, on the Members page.
    db.booking.findMany({
      where: {
        workspaceId: workspace.id,
        status: "CANCELLED",
        cancelReason: null,
        cancelledAt: { gt: restoreCutoff() },
        membership: { removedAt: null },
      },
      include: { membership: { include: { user: { select: { name: true, email: true } } } } },
      orderBy: { cancelledAt: "desc" },
    }),
  ]);

  // In the workspace's time zone, so "yesterday 23:30" doesn't read as today.
  const stamp = new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: workspace.timezone,
  });
  const detail = (d: string | null) => {
    const range = parseBookingDetail(d);
    return range ? formatRange(range.start, range.end, locale) : d;
  };

  const card = "space-y-4 rounded-[18px] border border-border bg-surface p-5 sm:p-6";
  const h2 = "text-[17px] font-semibold";
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{t.eyebrow}</p>
        <h1 className="text-[28px] leading-tight font-medium sm:text-[32px]">{t.title}</h1>
        <p className="text-sm text-muted">{t.subtitle}</p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_310px]">
        <div className="min-w-0 space-y-6">
          <section className={card} aria-labelledby="cancelled-title">
            <h2 id="cancelled-title" className={h2}>
              {t.cancelledHeading}
            </h2>
            <div className="flex items-center justify-between gap-3 text-xs text-muted">
              <span>{t.cancelledPeriod}</span>
              <span className="rounded-md bg-surface-muted px-2 py-1 font-semibold">{t.cancellations(cancelled.length)}</span>
            </div>
            {cancelled.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-3 py-8 text-center">
                <span aria-hidden className="grid size-16 place-items-center rounded-[20px] bg-primary-soft text-primary">
                  <CalendarCheck2 className="size-[30px]" strokeWidth={1.5} />
                </span>
                <p className="text-[19px] font-medium">{t.cancelledEmptyTitle}</p>
                <p className="text-[13px] text-muted">{t.cancelledEmptyBody}</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {cancelled.map((b) => {
                  const span = spanOf(b);
                  return (
                    <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                      <span>
                        <span className="font-medium">{b.membership.user.name ?? b.membership.user.email}</span> ·{" "}
                        {formatRange(span.start, span.end, locale)}{" "}
                        <span className="text-muted">· {t.daysLeft(restoreDaysLeft(b.cancelledAt!))}</span>
                      </span>
                      <ActionForm action={restoreBookingAction.bind(null, slug, b.id)}>
                        <button className="btn-secondary px-3 py-1">{t.restore}</button>
                      </ActionForm>
                    </li>
                  );
                })}
              </ul>
            )}
            <hr className="border-border" />
            <p className="text-xs text-muted">{cancelled.length === 0 ? t.nothingToRestore : t.cancelledHint}</p>
          </section>

          <section className={card} aria-labelledby="history-title">
            <h2 id="history-title" className={h2}>
              {t.historyHeading}
            </h2>
            <p className="text-xs text-muted">{t.recorded(events.length)}</p>
            {events.length === 0 ? (
              <p className="border-t border-border pt-4 text-sm text-muted">{t.empty}</p>
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {events.map((e) => {
                  const actor = e.actor ? (e.actor.name ?? e.actor.email) : t.someone;
                  return (
                    <li key={e.id} className="flex items-start gap-3 py-4">
                      <Avatar label={actor} className="size-9 text-xs" />
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm">{t.event(e.action, actor, e.targetLabel ?? "", detail(e.detail))}</p>
                        <time dateTime={e.createdAt.toISOString()} className="text-xs text-muted">
                          {stamp.format(e.createdAt)}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="border-t border-border pt-4 text-xs text-muted">{t.upToDate}</p>
          </section>
        </div>

        <aside className="space-y-5">
          <section className={card} aria-labelledby="record-title">
            <h2 id="record-title" className={h2}>
              {t.record.title}
            </h2>
            <p className="flex items-center gap-2.5 text-sm font-semibold">
              <History aria-hidden className="size-5 text-primary" />
              {t.record.retentionTitle}
            </p>
            <p className="text-[13px] text-muted">{t.record.retentionBody}</p>
            <hr className="border-border" />
            <p className="text-[13px] font-semibold">{t.record.essentialsTitle}</p>
            <p className="text-[13px] text-muted">{t.record.essentialsBody}</p>
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-[13px] font-semibold">{t.record.recoveryTitle}</p>
              <p className="text-xs text-muted">{t.record.recoveryBody}</p>
            </div>
          </section>
          <section className="space-y-2.5 rounded-[18px] bg-primary-soft p-5 text-primary-ink">
            <h2 className="text-sm font-semibold">{t.shortcut.title}</h2>
            <p className="text-xs">{t.shortcut.body}</p>
            <Link href={`/w/${slug}/me`} className="inline-flex min-h-11 items-center text-[13px] font-semibold underline">
              {t.shortcut.link}
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
