import { ActionForm } from "@/components/action-form";
import { db } from "@/lib/db";
import { formatDate, toISO } from "@/lib/dates";
import { OPERATOR } from "@/lib/legal";
import { accessOf, isOverLimit, planFor, PLANS, type PaidPlan } from "@/lib/plans";
import { requireAdmin } from "@/lib/session";
import { priceId, stripe } from "@/lib/stripe";
import { checkoutAction, portalAction } from "./actions";

export const metadata = { title: "Billing" };

const longDate = { day: "numeric", month: "long", year: "numeric" } as const;

export default async function BillingPage({ params, searchParams }: PageProps<"/w/[slug]/billing">) {
  const { slug } = await params;
  const { checkout } = await searchParams;
  const { workspace } = await requireAdmin(slug);
  const access = accessOf(workspace);
  const members = await db.membership.count({ where: { workspaceId: workspace.id, removedAt: null } });
  const fits = planFor(members);
  const ready = Boolean(stripe() && priceId("TEAM", "monthly"));

  const status =
    access.kind === "trial"
      ? `Free trial: ${access.trialDaysLeft} ${access.trialDaysLeft === 1 ? "day" : "days"} left, with everything for up to ${access.maxMembers} people.`
      : access.kind === "paid"
        ? `${access.name} plan${workspace.currentPeriodEnd ? `, renews on ${formatDate(toISO(workspace.currentPeriodEnd), longDate)}` : ""}${
            workspace.billingStatus === "past_due" ? ". The last payment failed; update the card to keep the plan." : "."
          }`
        : `Free plan, for up to ${PLANS.FREE.maxMembers} people, without Teams and Slack posts.`;

  return (
    <div className="max-w-3xl space-y-6">
      {checkout === "success" && (
        <p role="status" className="card border-green-500/40 bg-green-50 text-sm dark:bg-green-900/20">
          Thanks! Your plan is active as soon as Stripe confirms the payment, usually within a few seconds.
        </p>
      )}

      <section className="card space-y-2">
        <h2 className="font-medium">Your plan</h2>
        <p className="text-sm">{status}</p>
        <p className={`text-sm ${isOverLimit(access, members) ? "font-medium text-red-600" : "text-muted"}`}>
          {members} of {access.maxMembers} people
          {isOverLimit(access, members) && ". New bookings are paused until you upgrade or remove people."}
        </p>
        {workspace.stripeCustomerId && (
          <ActionForm action={portalAction.bind(null, slug)}>
            <button className="btn-secondary">Invoices, card and cancelling</button>
          </ActionForm>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Plans">
        {(["FREE", "TEAM", "BUSINESS"] as const).map((key) => {
          const plan = PLANS[key];
          const current = access.kind === "paid" ? access.plan === key : access.kind === "free" && key === "FREE";
          return (
            <div key={key} className={`card flex flex-col gap-3 ${fits === key ? "ring-2 ring-primary" : ""}`}>
              <div>
                <h3 className="font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted">Up to {plan.maxMembers} people</p>
              </div>
              <p>
                <span className="text-2xl font-semibold">€{plan.monthly}</span>
                <span className="text-sm text-muted"> / month</span>
                {plan.yearly > 0 && <span className="block text-xs text-muted">or €{plan.yearly} / year (2 months free)</span>}
              </p>
              <ul className="flex-1 space-y-1 text-sm">
                <li>Allowances, half days, holidays per state</li>
                <li>Approvals and calendar feeds</li>
                <li>{plan.chat ? "Microsoft Teams and Slack posts" : "No Teams or Slack posts"}</li>
              </ul>
              {fits === key && <p className="text-xs font-medium text-primary">Fits your team of {members}</p>}
              {current ? (
                <p className="text-sm font-medium">Current plan</p>
              ) : key !== "FREE" && ready ? (
                <div className="flex flex-col gap-2">
                  <ActionForm action={checkoutAction.bind(null, slug, key as PaidPlan, "monthly")}>
                    <button className="btn w-full">Monthly</button>
                  </ActionForm>
                  <ActionForm action={checkoutAction.bind(null, slug, key as PaidPlan, "yearly")}>
                    <button className="btn-secondary w-full">Yearly</button>
                  </ActionForm>
                </div>
              ) : null}
            </div>
          );
        })}
      </section>

      {!ready && (
        <p className="text-sm text-muted">Online payment isn&apos;t switched on yet. Write to {OPERATOR.email} to upgrade.</p>
      )}
      <p className="text-sm text-muted">
        Prices are net; German VAT (19%) is added for German customers, and EU businesses with a VAT ID get reverse charge. More than{" "}
        {PLANS.BUSINESS.maxMembers} people? Write to {OPERATOR.email} for an offer with invoice billing.
      </p>
    </div>
  );
}
