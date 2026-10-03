import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { db } from "@/lib/db";
import { getMessages } from "@/lib/i18n/server";
import { dismissOnboardingAction } from "./onboarding-actions";

type Workspace = {
  id: string;
  settings: {
    holidayCountry: string | null;
    teamsWebhookUrl: string | null;
    slackWebhookUrl: string | null;
    onboardingDismissedAt: Date | null;
  } | null;
};

/** Getting-started steps for a new workspace's admins; disappears once done or dismissed. */
export async function Onboarding({ slug, workspace }: { slug: string; workspace: Workspace }) {
  const s = workspace.settings;
  if (s?.onboardingDismissedAt) return null;
  const [members, invites, bookings] = await Promise.all([
    db.membership.count({ where: { workspaceId: workspace.id, removedAt: null } }),
    db.invitation.count({ where: { workspaceId: workspace.id, revokedAt: null } }),
    db.booking.count({ where: { workspaceId: workspace.id } }),
  ]);
  const base = `/w/${slug}`;
  const t = (await getMessages()).workspace.onboarding;
  const steps = [
    { done: Boolean(s?.holidayCountry), label: t.steps.holidays, href: `${base}/holidays` },
    { done: members > 1 || invites > 0, label: t.steps.invite, href: `${base}/members` },
    { done: Boolean(s?.teamsWebhookUrl || s?.slackWebhookUrl), label: t.steps.chat, href: `${base}/settings` },
    { done: bookings > 0, label: t.steps.book, href: `${base}/book` },
  ];
  const left = steps.filter((x) => !x.done).length;
  if (left === 0) return null;

  return (
    <section className="card space-y-3" aria-labelledby="onboarding-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="onboarding-title" className="font-medium">
            {t.title}
          </h2>
          <p className="text-sm text-muted">{t.progress(steps.length - left, steps.length)}</p>
        </div>
        <ActionForm action={dismissOnboardingAction.bind(null, slug)}>
          <button className="text-sm text-muted hover:text-foreground hover:underline">{t.hide}</button>
        </ActionForm>
      </div>
      <ol className="space-y-2">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className={`grid size-5 shrink-0 place-items-center rounded-full text-xs ${
                step.done ? "bg-green-600 text-white" : "border border-border"
              }`}
            >
              {step.done ? "✓" : ""}
            </span>
            {step.done ? (
              <span className="text-muted line-through">
                {step.label}
                <span className="sr-only">{t.done}</span>
              </span>
            ) : (
              <Link href={step.href} className="text-primary hover:underline">
                {step.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
