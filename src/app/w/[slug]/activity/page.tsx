import { ActionForm } from "@/components/action-form";
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

  return (
    <div className="max-w-3xl space-y-6">
      <section className="card space-y-2">
        <h2 className="font-medium">{t.cancelledHeading}</h2>
        <p className="text-xs opacity-60">{t.cancelledHint}</p>
        {cancelled.length === 0 ? (
          <p className="text-sm text-muted">{t.cancelledEmpty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {cancelled.map((b) => {
              const span = spanOf(b);
              return (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
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
      </section>

      <section className="card space-y-2">
        <h2 className="font-medium">{t.title}</h2>
        <p className="text-xs opacity-60">{t.intro}</p>
        {events.length === 0 ? (
          <p className="text-sm text-muted">{t.empty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2 text-sm">
                <span>{t.event(e.action, e.actor ? (e.actor.name ?? e.actor.email) : t.someone, e.targetLabel ?? "", detail(e.detail))}</span>
                <time dateTime={e.createdAt.toISOString()} className="text-xs text-muted">
                  {stamp.format(e.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
