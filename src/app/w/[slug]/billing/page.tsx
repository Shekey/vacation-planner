import { Check, ChevronDown, Info, MessageCircle, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { db } from "@/lib/db";
import { formatDate, todayIn } from "@/lib/dates";
import { intlLocale, type Locale } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { OPERATOR } from "@/lib/legal";
import { FOUNDER_DISCOUNT_PERCENT, founderPrice } from "@/lib/beta";
import {
  accessOf,
  isOverLimit,
  planFor,
  PLANS,
  SETUP_SERVICE_EUR,
  type PaidPlan,
} from "@/lib/plans";
import { RETENTION_YEARS } from "@/lib/retention";
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
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default async function BillingPage({
  params,
  searchParams,
}: PageProps<"/w/[slug]/billing">) {
  const { slug } = await params;
  const { checkout } = await searchParams;
  const { workspace } = await requireAdmin(slug);
  const access = accessOf(workspace);
  const locale = await getLocale();
  const t = (await getMessages()).billing;
  const members = await db.membership.count({
    where: { workspaceId: workspace.id, removedAt: null, isSample: false },
  });
  const fits = planFor(members);
  const ready = Boolean(stripe() && priceId("TEAM", "monthly"));

  const day = (d: Date | null) =>
    d ? formatDate(todayIn(workspace.timezone, d), longDate, locale) : null;
  const trialEnd = day(workspace.trialEndsAt) ?? "";
  const pastDue = workspace.billingStatus === "past_due";
  const status =
    access.kind === "beta"
      ? t.statusBeta
      : access.kind === "trial"
        ? t.statusTrial(access.trialDaysLeft, access.maxMembers, trialEnd)
        : access.kind === "paid"
          ? t.statusPaid(
              t.planName[access.plan],
              day(workspace.currentPeriodEnd),
              pastDue,
              day(workspace.cancelAt),
            )
          : t.statusFree(PLANS.FREE.maxMembers);
  // Plain words on what ending the trial, cancelling or a failed payment does: never deletes anything.
  const dataNote =
    access.kind === "beta"
      ? t.dataBeta
      : access.kind === "trial"
        ? t.dataTrial(trialEnd, PLANS.FREE.maxMembers)
        : access.kind === "paid"
          ? pastDue
            ? t.dataPastDue
            : t.dataPaid(PLANS.FREE.maxMembers)
          : t.dataFree;

  const beta = access.kind === "beta";
  const card = "space-y-4 rounded-[18px] border border-border bg-surface p-5 sm:p-6";
  const detail = "space-y-2 border-t border-border py-3";
  const detailTitle = "flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-semibold [&::-webkit-details-marker]:hidden";
  const mail = `mailto:${OPERATOR.email}`;
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{t.eyebrow}</p>
        <h1 className="text-[28px] leading-tight font-medium sm:text-[32px]">{t.title}</h1>
        <p className="text-sm text-muted">{beta ? t.subtitleBeta : t.subtitle}</p>
      </div>

      {checkout === "success" && (
        <p role="status" className="rounded-[10px] bg-success-soft p-4 text-sm text-success">
          {t.thanks}
        </p>
      )}

      <section aria-labelledby="current-plan" className="space-y-4 rounded-[18px] bg-primary-soft p-6 text-primary-ink sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="current-plan" className="inline-flex items-center gap-1.5 rounded-md bg-surface/60 px-2 py-1 text-[11px] font-semibold">
            <Sparkles aria-hidden className="size-3" />
            {beta ? t.currentBeta : t.yourPlan}
          </h2>
          <p className="text-xs">{beta ? t.membersIncluded(members) : t.peopleCount(members, access.maxMembers)}</p>
        </div>
        {beta ? (
          <>
            <p className="flex flex-wrap items-baseline gap-2.5">
              <span className="text-[40px] leading-none font-medium">€0</span>
              <span className="text-sm">{t.betaAmountNote}</span>
            </p>
            <p className="text-[13px]">{t.betaNoCharges}</p>
          </>
        ) : (
          <>
            <p className="text-sm">{status}</p>
            {isOverLimit(access, members) && <p className="text-sm font-semibold">{t.overLimit.replace(/^\.\s*/, "")}</p>}
            {workspace.stripeCustomerId && (
              <ActionForm action={portalAction.bind(null, slug)}>
                <button className="btn-secondary min-h-11 rounded-[10px] px-4 text-[13px]">{t.portal}</button>
              </ActionForm>
            )}
          </>
        )}
      </section>

      <div className="flex gap-2.5 rounded-[10px] bg-primary-soft p-4 text-primary-ink">
        <Info aria-hidden className="mt-0.5 size-[18px] shrink-0" />
        <div className="space-y-1">
          <p className="text-[13px] font-semibold">{beta ? t.afterBeta.title : t.dataHeading}</p>
          <p className="text-xs">
            {beta
              ? members > PLANS.FREE.maxMembers
                ? t.afterBeta.over(members, PLANS.FREE.maxMembers)
                : t.afterBeta.fits(PLANS.FREE.maxMembers)
              : dataNote}
            {!beta && members > PLANS.FREE.maxMembers && access.kind !== "paid" && <> {t.dataOverFree(members, PLANS.FREE.maxMembers)}</>}
          </p>
        </div>
      </div>

      <section aria-labelledby="plans-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="plans-title" className="text-lg font-semibold">
            {beta ? t.plansAfter : t.plans}
          </h2>
          {beta && <span className="rounded-md bg-surface-muted px-2 py-1 text-[11px] font-semibold text-muted">{t.notSubscribed}</span>}
        </div>
        <p className="text-xs text-muted">{t.netNote}</p>
        <div className="grid gap-6 md:grid-cols-3">
          {(["FREE", "TEAM", "BUSINESS"] as const).map((key) => {
            const plan = PLANS[key];
            const current = access.kind === "paid" ? access.plan === key : access.kind === "free" && key === "FREE";
            const fitsHere = members <= plan.maxMembers;
            return (
              <div
                key={key}
                className={`flex flex-col gap-4 rounded-[18px] bg-surface p-6 ${
                  fits === key ? "border-2 border-primary" : "border border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">{t.planName[key]}</h3>
                  {fits === key && <span className="rounded-md bg-primary-soft px-2 py-1 text-[11px] font-semibold text-primary-ink">{t.fitsBadge}</span>}
                </div>
                <p className="flex items-baseline gap-1.5">
                  <span className="text-[32px] leading-none font-medium">{euros(plan.monthly, locale)}</span>
                  <span className="text-xs text-muted">{t.perMonth.trim()}</span>
                </p>
                <p className="text-sm font-semibold">{t.upTo(plan.maxMembers)}</p>
                {beta && (
                  <p className={`flex items-start gap-2 text-xs ${fitsHere ? "text-success" : "text-muted"}`}>
                    {fitsHere ? <Check aria-hidden className="size-4 shrink-0" /> : <Info aria-hidden className="size-4 shrink-0" />}
                    {fitsHere ? t.fitsMembers(members) : t.tooSmall(members)}
                  </p>
                )}
                {!beta && (
                  <>
                    {plan.yearly > 0 && <p className="text-xs text-muted">{t.orYearly(euros(plan.yearly, locale))}</p>}
                    <ul className="flex-1 space-y-1 text-sm text-muted">
                      <li>{t.featureAllowances}</li>
                      <li>{t.featureApprovals}</li>
                      <li>{plan.chat ? t.chatYes : t.chatNo}</li>
                    </ul>
                  </>
                )}
                <hr className="border-border" />
                {beta && key === "FREE" && (
                  <div className="space-y-2 text-muted">
                    <p className="text-[13px]">{t.freeNote(plan.maxMembers)}</p>
                    <p className="text-xs">{t.freeNote2}</p>
                  </div>
                )}
                {beta && key !== "FREE" && workspace.founderRate && (
                  <div className="space-y-1.5">
                    <span className="inline-block rounded-md bg-primary-soft px-2 py-1 text-[11px] font-semibold text-primary-ink">
                      {t.founderBadge(FOUNDER_DISCOUNT_PERCENT)}
                    </span>
                    <p className="text-base font-semibold text-primary-ink">
                      {euros(founderPrice(plan.monthly), locale)}
                      {t.perMonth}
                    </p>
                    <p className="text-xs text-muted">{t.founderOnce}</p>
                  </div>
                )}
                {!beta &&
                  (current ? (
                    <p className="text-sm font-semibold">{t.current}</p>
                  ) : key !== "FREE" && ready ? (
                    <div className="flex flex-col gap-2">
                      <ActionForm action={checkoutAction.bind(null, slug, key as PaidPlan, "monthly")}>
                        <button className="btn min-h-11 w-full rounded-[10px] text-[13px]">{t.monthly}</button>
                      </ActionForm>
                      <ActionForm action={checkoutAction.bind(null, slug, key as PaidPlan, "yearly")}>
                        <button className="btn-secondary min-h-11 w-full rounded-[10px] text-[13px]">{t.yearly}</button>
                      </ActionForm>
                    </div>
                  ) : null)}
              </div>
            );
          })}
        </div>
        {beta && fits && <p className="text-xs text-muted">{t.suitable(t.planName[fits], members)}</p>}
        {!ready && !beta && <p className="text-sm text-muted">{t.notReady(OPERATOR.email)}</p>}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className={card} aria-labelledby="after-title">
          <h2 id="after-title" className="text-[17px] font-semibold">
            {t.details.title}
          </h2>
          <details open className={detail}>
            <summary className={detailTitle}>
              {t.details.overTitle}
              <ChevronDown aria-hidden className="size-4 text-muted" />
            </summary>
            <p className="text-xs text-muted">{t.details.overBody}</p>
          </details>
          <details open className={detail}>
            <summary className={detailTitle}>
              {t.details.controlTitle}
              <ChevronDown aria-hidden className="size-4 text-muted" />
            </summary>
            <p className="text-xs text-muted">{t.details.controlBody}</p>
          </details>
          <details open className={detail}>
            <summary className={detailTitle}>
              {t.details.retentionTitle}
              <ChevronDown aria-hidden className="size-4 text-muted" />
            </summary>
            <p className="text-xs text-muted">{t.dataRetention(RETENTION_YEARS)}</p>
          </details>
        </section>
        <section className={card} aria-labelledby="tax-title">
          <h2 id="tax-title" className="text-[17px] font-semibold">
            {t.tax.title}
          </h2>
          <details open className={detail}>
            <summary className={detailTitle}>
              {t.tax.vatTitle}
              <ChevronDown aria-hidden className="size-4 text-muted" />
            </summary>
            <p className="text-xs text-muted">{t.tax.vatBody}</p>
          </details>
          <details open className={detail}>
            <summary className={detailTitle}>
              {t.tax.migrationTitle}
              <ChevronDown aria-hidden className="size-4 text-muted" />
            </summary>
            <p className="text-xs text-muted">{t.tax.migrationBody(euros(SETUP_SERVICE_EUR, locale))}</p>
          </details>
          <details open className={detail}>
            <summary className={detailTitle}>
              {t.tax.largeTitle(PLANS.BUSINESS.maxMembers)}
              <ChevronDown aria-hidden className="size-4 text-muted" />
            </summary>
            <p className="text-xs text-muted">{t.tax.largeBody}</p>
          </details>
          <a href={mail} className="btn-secondary min-h-11 rounded-[10px] px-4 text-[13px] text-primary-ink">
            <MessageCircle aria-hidden className="size-[17px]" /> {t.tax.contact}
          </a>
        </section>
      </div>
    </div>
  );
}
