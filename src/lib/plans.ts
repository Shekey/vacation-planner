import type { Plan } from "@/generated/prisma/enums";

export const TRIAL_DAYS = 30;

/** One-off price, in euros net, to have us import a team from Excel or an old tool; included with a yearly Business plan. */
export const SETUP_SERVICE_EUR = 99;

/** Prices are net, in euros. Larger teams talk to us. */
export const PLANS = {
  FREE: { name: "Free", maxMembers: 5, monthly: 0, yearly: 0, chat: false },
  TEAM: { name: "Team", maxMembers: 25, monthly: 39, yearly: 390, chat: true },
  BUSINESS: { name: "Business", maxMembers: 75, monthly: 89, yearly: 890, chat: true },
} as const satisfies Record<Plan, { name: string; maxMembers: number; monthly: number; yearly: number; chat: boolean }>;

export type PaidPlan = Exclude<Plan, "FREE">;

/** Stripe statuses that keep a paid plan running; past_due gets Stripe's retry period before it cancels. */
const LIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export type Access = {
  /** What the workspace gets right now. */
  kind: "trial" | "paid" | "free";
  plan: Plan;
  name: string;
  maxMembers: number;
  /** Teams and Slack posts. */
  chat: boolean;
  trialDaysLeft: number;
};

type BillingRow = { plan: Plan; billingStatus: string | null; trialEndsAt: Date | null };

/** The plan a workspace is on now: a live subscription, else the trial (everything, up to the Business limit), else Free. */
export function accessOf(ws: BillingRow, now = new Date()): Access {
  const trialDaysLeft = ws.trialEndsAt ? Math.max(0, Math.ceil((ws.trialEndsAt.getTime() - now.getTime()) / 86_400_000)) : 0;
  if (ws.plan !== "FREE" && ws.billingStatus && LIVE_STATUSES.has(ws.billingStatus)) {
    return { kind: "paid", plan: ws.plan, ...pick(ws.plan), trialDaysLeft };
  }
  if (trialDaysLeft > 0) {
    return { kind: "trial", plan: "BUSINESS", name: "Trial", maxMembers: PLANS.BUSINESS.maxMembers, chat: true, trialDaysLeft };
  }
  return { kind: "free", plan: "FREE", ...pick("FREE"), trialDaysLeft: 0 };
}

function pick(plan: Plan) {
  const { name, maxMembers, chat } = PLANS[plan];
  return { name, maxMembers, chat };
}

/** The smallest plan that fits a team, or null when it needs a custom offer. */
export function planFor(members: number): Plan | null {
  if (members <= PLANS.FREE.maxMembers) return "FREE";
  if (members <= PLANS.TEAM.maxMembers) return "TEAM";
  if (members <= PLANS.BUSINESS.maxMembers) return "BUSINESS";
  return null;
}

/**
 * Whether a subscription update from Stripe should be copied onto the workspace. A workspace has one
 * subscription at a time, but an older one can still send events, e.g. an abandoned checkout expiring
 * after the customer subscribed again. Those must not knock out the live one.
 */
export function shouldSyncSubscription(
  current: { stripeSubscriptionId: string | null; billingStatus: string | null },
  incoming: { id: string; status: string },
): boolean {
  if (!current.stripeSubscriptionId || current.stripeSubscriptionId === incoming.id) return true;
  return LIVE_STATUSES.has(incoming.status) || !current.billingStatus || !LIVE_STATUSES.has(current.billingStatus);
}

/** Which trial reminder email is due: "first" a week before the end, "last" in the final two days, each once. */
export function trialReminderDue(
  ws: BillingRow & { trialReminder7SentAt: Date | null; trialReminder1SentAt: Date | null },
  now = new Date(),
): "first" | "last" | null {
  const access = accessOf(ws, now);
  // Nothing to say once they pay or when the trial is already over.
  if (access.kind !== "trial") return null;
  // Two days, not one: the cron runs once a morning and the trial ends at the time of day it started.
  if (access.trialDaysLeft <= 2) return ws.trialReminder1SentAt ? null : "last";
  if (access.trialDaysLeft <= 7) return ws.trialReminder7SentAt ? null : "first";
  return null;
}

/** Over the limit, people can still see and cancel bookings but not add new ones. */
export function isOverLimit(access: Access, activeMembers: number): boolean {
  return activeMembers > access.maxMembers;
}
