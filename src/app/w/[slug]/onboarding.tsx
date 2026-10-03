import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { db } from "@/lib/db";
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
  const steps = [
    { done: Boolean(s?.holidayCountry), label: "Import public holidays for your state", href: `${base}/holidays` },
    { done: members > 1 || invites > 0, label: "Invite your team (paste emails straight from Excel)", href: `${base}/members` },
    { done: Boolean(s?.teamsWebhookUrl || s?.slackWebhookUrl), label: "Connect Microsoft Teams or Slack", href: `${base}/settings` },
    { done: bookings > 0, label: "Book the first time off", href: `${base}/book` },
  ];
  const left = steps.filter((x) => !x.done).length;
  if (left === 0) return null;

  return (
    <section className="card space-y-3" aria-labelledby="onboarding-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="onboarding-title" className="font-medium">
            Get your team set up
          </h2>
          <p className="text-sm text-muted">
            {steps.length - left} of {steps.length} done
          </p>
        </div>
        <ActionForm action={dismissOnboardingAction.bind(null, slug)}>
          <button className="text-sm text-muted hover:text-foreground hover:underline">Hide</button>
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
                <span className="sr-only"> (done)</span>
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
