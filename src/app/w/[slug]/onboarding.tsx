import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { db } from "@/lib/db";
import { getMessages } from "@/lib/i18n/server";
import { dismissOnboardingAction } from "./onboarding-actions";
import { SampleTeamButton } from "./sample-team-button";

type Workspace = {
  id: string;
  settings: {
    holidayCountry: string | null;
    minPeoplePresent: number | null;
    teamsWebhookUrl: string | null;
    slackWebhookUrl: string | null;
    onboardingDismissedAt: Date | null;
  } | null;
};

/** Getting-started steps for a new workspace's admins; disappears once done or dismissed. */
export async function Onboarding({ slug, workspace }: { slug: string; workspace: Workspace }) {
  const s = workspace.settings;
  if (s?.onboardingDismissedAt) return null;
  // Sample people don't tick off "invite" or "book": the real team still has to do those.
  const [members, invites, bookings, samples] = await Promise.all([
    db.membership.count({ where: { workspaceId: workspace.id, removedAt: null, isSample: false } }),
    db.invitation.count({ where: { workspaceId: workspace.id, revokedAt: null } }),
    db.booking.count({ where: { workspaceId: workspace.id, membership: { isSample: false } } }),
    db.membership.count({ where: { workspaceId: workspace.id, isSample: true } }),
  ]);
  const base = `/w/${slug}`;
  const t = (await getMessages()).workspace.onboarding;
  const steps = [
    { key: "holidays", done: Boolean(s?.holidayCountry), href: `${base}/holidays` },
    { key: "invite", done: members > 1 || invites > 0, href: `${base}/members` },
    { key: "staffing", done: s?.minPeoplePresent != null, href: `${base}/settings` },
    { key: "chat", done: Boolean(s?.teamsWebhookUrl || s?.slackWebhookUrl), href: `${base}/settings` },
    { key: "book", done: bookings > 0, href: `${base}/book` },
  ] as const;
  const left = steps.filter((x) => !x.done).length;
  if (left === 0) return null;

  const done = steps.length - left;
  // The first open step is the one to do next.
  const next = steps.find((x) => !x.done)?.key;

  return (
    <section className="card space-y-4" aria-labelledby="onboarding-title">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h2 id="onboarding-title" className="font-semibold">
            {t.title}
          </h2>
          <p className="text-sm text-muted">
            {t.progress(done, steps.length)} · {t.allDoneSoon}
          </p>
        </div>
        <ActionForm action={dismissOnboardingAction.bind(null, slug)}>
          <button className="text-sm text-muted hover:text-foreground hover:underline">{t.hide}</button>
        </ActionForm>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/15" aria-hidden>
        <div className="h-full rounded-full bg-green-600 transition-[width]" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="space-y-1">
        {steps.map((step) => (
          <li key={step.key}>
            {step.done ? (
              <div className="flex items-center gap-3 px-2 py-1.5 text-sm">
                <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-green-600 text-xs text-white">
                  ✓
                </span>
                <span className="text-muted line-through">
                  {t.steps[step.key]}
                  <span className="sr-only">{t.done}</span>
                </span>
              </div>
            ) : (
              <Link
                href={step.href}
                className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-black/[0.04] dark:hover:bg-white/5 ${
                  step.key === next ? "bg-primary/5 ring-1 ring-primary/30" : ""
                }`}
              >
                <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full border border-border" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-primary">{t.steps[step.key]}</span>
                  <span className="block text-xs text-muted">{t.hints[step.key]}</span>
                </span>
                <span aria-hidden className="text-muted">
                  →
                </span>
              </Link>
            )}
          </li>
        ))}
      </ol>
      <SampleTeamButton slug={slug} samples={samples} />
    </section>
  );
}
