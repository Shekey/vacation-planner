import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DecisionForm } from "@/components/decision-form";
import { RequestCard } from "@/components/request-card";
import { EmptyState } from "@/components/ui";
import { todayIn } from "@/lib/dates";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { reviewRequests } from "@/lib/request-review";
import { requirePermission, settingsOf } from "@/lib/session";
import { decideAction } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).approvals.title };
}

export default async function ApprovalsPage({
  params,
}: PageProps<"/w/[slug]/approvals">) {
  const { slug } = await params;
  const { workspace } = await requirePermission(slug, "bookings:decide");
  const settings = settingsOf(workspace);
  const locale = await getLocale();
  const messages = await getMessages();
  const t = messages.approvals;

  if (!settings.approvalsEnabled) {
    return <p className="text-muted">{t.turnedOff}</p>;
  }

  const { rows, memberCount } = await reviewRequests(workspace, settings, {}, todayIn(workspace.timezone));

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
          {rows.map((review) => (
            // The anchor lets a chat post open the page at this request.
            <li key={review.b.id} id={`request-${review.b.id}`} className="scroll-mt-24">
              <RequestCard
                review={review}
                memberCount={memberCount}
                minPeoplePresent={settings.minPeoplePresent}
                locale={locale}
                messages={messages}
              >
                <DecisionForm action={decideAction.bind(null, slug, review.b.id)} t={t} />
              </RequestCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
