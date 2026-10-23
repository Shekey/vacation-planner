import type { Metadata } from "next";
import Link from "next/link";
import { DecisionForm } from "@/components/decision-form";
import { RequestCard } from "@/components/request-card";
import { StatusBadge } from "@/components/badges";
import { loadApproveLink } from "@/lib/approve-link-db";
import { spanOf } from "@/lib/bookings";
import { formatDate, formatRange, todayIn, toISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { reviewRequests } from "@/lib/request-review";
import { settingsOf } from "@/lib/session";
import { decideByLinkAction } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).approvals.link.title, referrer: "no-referrer" };
}

/**
 * Opened from "Approve" or "Decline" in a request email (#33). It shows the request with who else is off and the
 * staffing, and decides only when the button is pressed, so a mail scanner opening the link changes nothing.
 * Works without signing in: the signed link stands for the admin it was sent to.
 */
export default async function DecideByLinkPage({ params, searchParams }: PageProps<"/decide/[token]">) {
  const { token } = await params;
  const first = (await searchParams).d === "decline" ? "decline" : "approve";
  const locale = await getLocale();
  const messages = await getMessages();
  const t = messages.approvals;
  const ctx = await loadApproveLink(token);

  if (ctx.status !== "ok") {
    return (
      <Notice title={t.link.unavailable}>
        <p>{ctx.status === "notAdmin" ? t.link.notAdmin : t.link.broken}</p>
        <Link href="/workspaces" className="btn inline-flex min-h-11">
          {t.link.signIn}
        </Link>
      </Notice>
    );
  }

  const { workspace, admin } = ctx;
  const settings = settingsOf(workspace);
  const approvalsUrl = `/w/${workspace.slug}/approvals`;
  const { rows, memberCount } = await reviewRequests(workspace, settings, { id: ctx.bookingId }, todayIn(workspace.timezone));
  const review = rows[0];

  if (!review) {
    const booking = await db.booking.findFirst({
      where: { id: ctx.bookingId, workspaceId: workspace.id },
      include: { membership: { include: { user: { select: { name: true, email: true } } } }, decidedBy: { select: { name: true, email: true } } },
    });
    return (
      <Notice title={t.link.handledTitle}>
        {booking ? (
          <>
            <p className="flex flex-wrap items-center gap-2">
              <b>{booking.membership.user.name ?? booking.membership.user.email}</b>
              {formatRange(spanOf(booking).start, spanOf(booking).end, locale)}
              <StatusBadge status={booking.status} locale={locale} />
            </p>
            {booking.decidedBy && booking.decidedAt && booking.status !== "PENDING" && (
              <p className="text-muted">
                {t.link.decidedBy(
                  booking.decidedBy.name ?? booking.decidedBy.email,
                  formatDate(toISO(booking.decidedAt), { day: "numeric", month: "long" }, locale),
                )}
              </p>
            )}
          </>
        ) : (
          <p>{t.link.gone}</p>
        )}
        <Link href={approvalsUrl} className="btn inline-flex min-h-11">
          {t.link.openApprovals}
        </Link>
      </Notice>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="space-y-1">
        <p className="text-xs tracking-wide text-muted uppercase">{workspace.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{t.link.title}</h1>
      </div>
      {!settings.approvalsEnabled ? (
        <p className="text-muted">{t.turnedOff}</p>
      ) : (
        <RequestCard
          review={review}
          memberCount={memberCount}
          minPeoplePresent={settings.minPeoplePresent}
          locale={locale}
          messages={messages}
        >
          <DecisionForm action={decideByLinkAction.bind(null, token)} t={t} first={first} />
        </RequestCard>
      )}
      <p className="text-sm text-muted">{t.link.as(admin.user.email)}</p>
      <Link href={approvalsUrl} className="text-sm text-primary hover:underline">
        {t.link.allRequests}
      </Link>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card mx-auto mt-6 max-w-md space-y-4 p-6 sm:mt-12 sm:p-8">
      <h1 className="text-xl font-semibold">{title}</h1>
      {children}
    </div>
  );
}
