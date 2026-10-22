import type Stripe from "stripe";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { accessOf } from "@/lib/plans";
import { syncSubscription } from "@/lib/stripe";
import { makeWorkspace } from "@/test/db";

beforeAll(() => {
  process.env.STRIPE_PRICE_TEAM_MONTHLY = "price_team_monthly";
  process.env.STRIPE_PRICE_BUSINESS_MONTHLY = "price_business_monthly";
});

let n = 0;
function subscription(opts: { workspaceId?: string; customer: string; status: string; price?: string; id?: string }) {
  return {
    id: opts.id ?? `sub_${++n}_${Date.now()}`,
    status: opts.status,
    customer: opts.customer,
    metadata: opts.workspaceId ? { workspaceId: opts.workspaceId } : {},
    cancel_at: null,
    cancel_at_period_end: false,
    items: { data: [{ price: { id: opts.price ?? "price_team_monthly" }, current_period_end: 1_900_000_000 }] },
  } as unknown as Stripe.Subscription;
}

async function freeTeam() {
  const team = await makeWorkspace({ plan: "FREE", billingStatus: null });
  return { id: team.workspace.id, customer: `cus_${team.workspace.id}` };
}

const access = async (id: string) => accessOf(await db.workspace.findUniqueOrThrow({ where: { id } }));

describe("syncSubscription", () => {
  it("puts a workspace on the plan it paid for", async () => {
    const ws = await freeTeam();
    await syncSubscription(subscription({ workspaceId: ws.id, customer: ws.customer, status: "active" }));
    expect(await access(ws.id)).toMatchObject({ kind: "paid", plan: "TEAM", maxMembers: 25 });
  });

  it("follows a plan change made in the customer portal, found by the customer", async () => {
    const ws = await freeTeam();
    const live = subscription({ workspaceId: ws.id, customer: ws.customer, status: "active" });
    await syncSubscription(live);
    await syncSubscription(subscription({ id: live.id, customer: ws.customer, status: "active", price: "price_business_monthly" }));
    expect(await access(ws.id)).toMatchObject({ plan: "BUSINESS" });
  });

  it("ignores an old abandoned checkout that expires after the customer subscribed", async () => {
    const ws = await freeTeam();
    await syncSubscription(subscription({ workspaceId: ws.id, customer: ws.customer, status: "active" }));
    await syncSubscription(subscription({ workspaceId: ws.id, customer: ws.customer, status: "incomplete_expired" }));
    expect(await access(ws.id)).toMatchObject({ kind: "paid", plan: "TEAM" });
  });

  it("falls back to Free when the subscription ends, keeping the data", async () => {
    const ws = await freeTeam();
    const live = subscription({ workspaceId: ws.id, customer: ws.customer, status: "active" });
    await syncSubscription(live);
    await syncSubscription({ ...live, status: "canceled" } as Stripe.Subscription);
    expect(await access(ws.id)).toMatchObject({ kind: "free", maxMembers: 5 });
    expect(await db.membership.count({ where: { workspaceId: ws.id } })).toBe(2);
  });
});
