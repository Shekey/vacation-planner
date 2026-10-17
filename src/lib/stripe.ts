import Stripe from "stripe";
import type { Plan } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { shouldSyncSubscription, type PaidPlan } from "@/lib/plans";
import { getLocale, getMessages } from "@/lib/i18n/server";

/**
 * Stripe Billing: Checkout to subscribe, the Customer Portal to change plan, card or invoices,
 * and a webhook that mirrors the subscription onto the workspace. Card data never reaches this app.
 */

export type Interval = "monthly" | "yearly";

const PRICE_ENV: Record<PaidPlan, Record<Interval, string>> = {
  TEAM: { monthly: "STRIPE_PRICE_TEAM_MONTHLY", yearly: "STRIPE_PRICE_TEAM_YEARLY" },
  BUSINESS: { monthly: "STRIPE_PRICE_BUSINESS_MONTHLY", yearly: "STRIPE_PRICE_BUSINESS_YEARLY" },
};

let client: Stripe | null = null;

/** Null until STRIPE_SECRET_KEY is set, so the app runs without billing in development and previews. */
export function stripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
}

export function priceId(plan: PaidPlan, interval: Interval): string | null {
  return process.env[PRICE_ENV[plan][interval]] || null;
}

/** Maps a Stripe price back to our plan; unknown prices are ignored. */
export function planOfPrice(id: string | undefined): PaidPlan | null {
  if (!id) return null;
  for (const plan of Object.keys(PRICE_ENV) as PaidPlan[]) {
    if (Object.values(PRICE_ENV[plan]).some((env) => process.env[env] === id)) return plan;
  }
  return null;
}

export async function createCheckout(opts: {
  workspace: { id: string; name: string; stripeCustomerId: string | null };
  email: string;
  plan: PaidPlan;
  interval: Interval;
  returnUrl: string;
}): Promise<string> {
  const s = stripe();
  const price = priceId(opts.plan, opts.interval);
  if (!s || !price) throw new Error((await getMessages()).errors.paymentsNotSetUp);
  const session = await s.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    client_reference_id: opts.workspace.id,
    metadata: { workspaceId: opts.workspace.id },
    subscription_data: { metadata: { workspaceId: opts.workspace.id } },
    ...(opts.workspace.stripeCustomerId
      ? { customer: opts.workspace.stripeCustomerId, customer_update: { address: "auto", name: "auto" } }
      : { customer_email: opts.email }),
    // German invoices need the company's name, address and (for reverse charge) VAT ID.
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    // Needs Stripe Tax turned on in the dashboard; prices are then net and VAT is added per country.
    ...(process.env.STRIPE_AUTOMATIC_TAX === "1" ? { automatic_tax: { enabled: true } } : {}),
    allow_promotion_codes: true,
    // Stripe's pages in the app's language.
    locale: await getLocale(),
    success_url: `${opts.returnUrl}?checkout=success`,
    cancel_url: opts.returnUrl,
  });
  if (!session.url) throw new Error((await getMessages()).errors.noCheckoutLink);
  return session.url;
}

export async function createPortal(customerId: string, returnUrl: string): Promise<string> {
  const s = stripe();
  if (!s) throw new Error((await getMessages()).errors.paymentsNotSetUp);
  const session = await s.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl, locale: await getLocale() });
  return session.url;
}

/**
 * Copies a subscription's plan, status and renewal date onto its workspace. When it ends (canceled,
 * or unpaid after Stripe's retries) the workspace falls back to Free; no data is deleted.
 */
export async function syncSubscription(sub: Stripe.Subscription) {
  const workspaceId = sub.metadata?.workspaceId;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  // Prefer the id we put in the metadata; fall back to the customer for subscriptions changed in the portal.
  const where = workspaceId ? { id: workspaceId } : { stripeCustomerId: customerId };
  const workspace = await db.workspace.findFirst({ where, select: { id: true, stripeSubscriptionId: true, billingStatus: true } });
  if (!workspace) {
    console.warn("[stripe] no workspace for subscription", sub.id);
    return;
  }
  if (!shouldSyncSubscription(workspace, sub)) return;
  const item = sub.items.data[0];
  const plan: Plan = planOfPrice(item?.price.id) ?? "FREE";
  const periodEnd = item ? new Date(item.current_period_end * 1000) : null;
  await db.workspace.update({
    where: { id: workspace.id },
    data: {
      plan,
      billingStatus: sub.status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      currentPeriodEnd: periodEnd,
      // A cancel in the portal keeps the plan until then, so the Billing page says "ends" instead of "renews".
      cancelAt: sub.status === "canceled" ? null : sub.cancel_at ? new Date(sub.cancel_at * 1000) : sub.cancel_at_period_end ? periodEnd : null,
    },
  });
}

/** Ends a workspace's subscription right away, before the workspace is deleted, so the customer isn't charged again. */
export async function cancelSubscriptionNow(subscriptionId: string | null) {
  const s = stripe();
  if (!s || !subscriptionId) return;
  try {
    await s.subscriptions.cancel(subscriptionId);
  } catch (e) {
    // Already cancelled, or unknown in this Stripe account: nothing left to charge.
    if (!(e instanceof Stripe.errors.StripeInvalidRequestError)) throw e;
  }
}

/** Handles the webhook events this app subscribes to. */
export async function handleStripeEvent(event: Stripe.Event) {
  const s = stripe();
  if (!s) return;
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode !== "subscription" || !session.subscription) return;
      const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      await syncSubscription(await s.subscriptions.retrieve(id));
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      // Stripe doesn't promise the order of events, so an older "updated" could arrive after "deleted".
      // Fetching the subscription now always stores its latest state.
      await syncSubscription(await s.subscriptions.retrieve(event.data.object.id));
      return;
  }
}
