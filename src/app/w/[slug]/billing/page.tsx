import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { db } from "@/lib/db";
import { formatDate, toISO } from "@/lib/dates";
import { intlLocale, type Locale } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { OPERATOR } from "@/lib/legal";
import { accessOf, isOverLimit, planFor, PLANS, type PaidPlan } from "@/lib/plans";
import { requireAdmin } from "@/lib/session";
import { priceId, stripe } from "@/lib/stripe";
import { checkoutAction, portalAction } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).billing.title };
}

const longDate = { day: "numeric", month: "long", year: "numeric" } as const;

/** 15 → "€15" in English, "15 €" in German. */
function euros(amount: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default async function BillingPage({ params, searchParams }: PageProps<"/w/[slug]/billing">) {
  const { slug } = await params;
  const { checkout } = await searchParams;
  const { workspace } = await requireAdmin(slug);
  const access = accessOf(workspace);
  const locale = await getLocale();
  const t = (await getMessages()).billing;
  const members = await db.membership.count({ where: { workspaceId: workspace.id, removedAt: null } });
  const fits = planFor(members);
  const ready = Boolean(stripe() && priceId("TEAM", "monthly"));

  const status =
    access.kind === "trial"
      ? t.statusTrial(access.trialDaysLeft, access.maxMembers)
      : access.kind === "paid"
        ? t.statusPaid(
            t.planName[access.plan],
            workspace.currentPeriodEnd ? formatDate(toISO(workspace.currentPeriodEnd), longDate, locale) : null,
            workspace.billingStatus === "past_due",
          )
        : t.statusFree(PLANS.FREE.maxMembers);

  return (
    <div className="max-w-3xl space-y-6">
      {checkout === "success" && (
        <p role="status" className="card border-green-500/40 bg-green-50 text-sm dark:bg-green-900/20">
          {t.thanks}
        </p>
      )}

      <section className="card space-y-2">
        <h2 className="font-medium">{t.yourPlan}</h2>
        <p className="text-sm">{status}</p>
        <p className={`text-sm ${isOverLimit(access, members) ? "font-medium text-red-600" : "text-muted"}`}>
          {t.peopleCount(members, access.maxMembers)}
          {isOverLimit(access, members) && t.overLimit}
        </p>
        {workspace.stripeCustomerId && (
          <ActionForm action={portalAction.bind(null, slug)}>
            <button className="btn-secondary">{t.portal}</button>
          </ActionForm>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3" aria-label={t.plans}>
        {(["FREE", "TEAM", "BUSINESS"] as const).map((key) => {
          const plan = PLANS[key];
          const current = access.kind === "paid" ? access.plan === key : access.kind === "free" && key === "FREE";
          return (
            <div key={key} className={`card flex flex-col gap-3 ${fits === key ? "ring-2 ring-primary" : ""}`}>
              <div>
                <h3 className="font-semibold">{t.planName[key]}</h3>
                <p className="text-sm text-muted">{t.upTo(plan.maxMembers)}</p>
              </div>
              <p>
                <span className="text-2xl font-semibold">{euros(plan.monthly, locale)}</span>
                <span className="text-sm text-muted">{t.perMonth}</span>
                {plan.yearly > 0 && <span className="block text-xs text-muted">{t.orYearly(euros(plan.yearly, locale))}</span>}
              </p>
              <ul className="flex-1 space-y-1 text-sm">
                <li>{t.featureAllowances}</li>
                <li>{t.featureApprovals}</li>
                <li>{plan.chat ? t.chatYes : t.chatNo}</li>
              </ul>
              {fits === key && <p className="text-xs font-medium text-primary">{t.fits(members)}</p>}
              {current ? (
                <p className="text-sm font-medium">{t.current}</p>
              ) : key !== "FREE" && ready ? (
                <div className="flex flex-col gap-2">
                  <ActionForm action={checkoutAction.bind(null, slug, key as PaidPlan, "monthly")}>
                    <button className="btn w-full">{t.monthly}</button>
                  </ActionForm>
                  <ActionForm action={checkoutAction.bind(null, slug, key as PaidPlan, "yearly")}>
                    <button className="btn-secondary w-full">{t.yearly}</button>
                  </ActionForm>
                </div>
              ) : null}
            </div>
          );
        })}
      </section>

      {!ready && <p className="text-sm text-muted">{t.notReady(OPERATOR.email)}</p>}
      <p className="text-sm text-muted">{t.vatNote(PLANS.BUSINESS.maxMembers, OPERATOR.email)}</p>
    </div>
  );
}
