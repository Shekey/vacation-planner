import type { Plan } from "@/generated/prisma/enums";

export const TRIAL_DAYS = 30;

/** Prices are net, in euros. Larger teams talk to us. */
export const PLANS = {
  FREE: { name: "Free", maxMembers: 5, monthly: 0, yearly: 0, chat: false },
  TEAM: { name: "Team", maxMembers: 20, monthly: 15, yearly: 150, chat: true },
  BUSINESS: { name: "Business", maxMembers: 50, monthly: 35, yearly: 350, chat: true },
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

/** The plan a workspace is on now: a live subscription, else the trial (everything, up to 50 people), else Free. */
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

/** Over the limit, people can still see and cancel bookings but not add new ones. */
export function isOverLimit(access: Access, activeMembers: number): boolean {
  return activeMembers > access.maxMembers;
}
