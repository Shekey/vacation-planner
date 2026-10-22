import type Stripe from "stripe";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { messagesFor } from "@/lib/i18n";
import { accessOf } from "@/lib/plans";
import { purgeOldData } from "@/lib/retention";
import { requireAdmin, requireUser } from "@/lib/session";
import { syncSubscription } from "@/lib/stripe";
import { makeWorkspace } from "@/test/db";
import { deleteWorkspaceAction } from "../w/[slug]/settings/actions";
import { restoreWorkspaceAction } from "./restore-actions";

vi.mock("@/lib/session", async (original) => ({
  ...(await original<typeof import("@/lib/session")>()),
  requireAdmin: vi.fn(),
  requireUser: vi.fn(),
}));

// A Stripe account in memory: just the subscription calls the app makes.
const subs = new Map<string, Stripe.Subscription>();
vi.mock("stripe", () => {
  class StripeInvalidRequestError extends Error {}
  class FakeStripe {
    static errors = { StripeInvalidRequestError };
    subscriptions = {
      retrieve: async (id: string) => {
        const sub = subs.get(id);
        if (!sub) throw new StripeInvalidRequestError("No such subscription");
        return structuredClone(sub);
      },
      update: async (id: string, data: { cancel_at_period_end?: boolean; metadata?: Record<string, string> }) => {
        const sub = subs.get(id)!;
        const metadata = { ...sub.metadata, ...data.metadata };
        for (const [k, v] of Object.entries(metadata)) if (v === "") delete metadata[k];
        subs.set(id, { ...sub, cancel_at_period_end: data.cancel_at_period_end ?? sub.cancel_at_period_end, metadata });
        return structuredClone(subs.get(id)!);
      },
      cancel: async (id: string) => {
        subs.set(id, { ...subs.get(id)!, status: "canceled" });
        return structuredClone(subs.get(id)!);
      },
    };
  }
  return { default: FakeStripe };
});

beforeAll(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_fake";
  process.env.STRIPE_PRICE_TEAM_MONTHLY = "price_team_monthly";
});

const t = messagesFor("en").home;

/** A workspace on a paid Team plan with a live subscription, and its admin signed in. */
async function payingTeam() {
  const team = await makeWorkspace({ plan: "FREE", billingStatus: null });
  const id = `sub_${team.workspace.id}`;
  subs.set(id, {
    id,
    status: "active",
    customer: `cus_${team.workspace.id}`,
    metadata: { workspaceId: team.workspace.id },
    cancel_at: null,
    cancel_at_period_end: false,
    items: { data: [{ price: { id: "price_team_monthly" }, current_period_end: Math.floor(Date.now() / 1000) + 20 * 86_400 }] },
  } as unknown as Stripe.Subscription);
  await syncSubscription(subs.get(id)!);
  const workspace = await db.workspace.findUniqueOrThrow({ where: { id: team.workspace.id }, include: { settings: true } });
  const membership = await db.membership.findUniqueOrThrow({ where: { id: team.admin.id } });
  const user = { id: team.admin.user.id, email: team.admin.user.email, name: "Admin" };
  vi.mocked(requireAdmin).mockResolvedValue({ user, membership: { ...membership, workspace }, workspace });
  vi.mocked(requireUser).mockResolvedValue(user as Awaited<ReturnType<typeof requireUser>>);
  return { workspace, subId: id };
}

async function deleteIt(workspace: { slug: string; name: string }) {
  const form = new FormData();
  form.set("confirmName", workspace.name);
  await expect(deleteWorkspaceAction(workspace.slug, {}, form)).rejects.toThrow(); // redirects home
}

/** What Stripe's webhook does after any change to the subscription. */
const webhook = (subId: string) => syncSubscription(subs.get(subId)!);
const access = async (id: string) => accessOf(await db.workspace.findUniqueOrThrow({ where: { id } }));

describe("deleting and restoring a paid workspace", () => {
  it("comes back on the plan it paid for, renewing again", async () => {
    const { workspace, subId } = await payingTeam();
    await deleteIt(workspace);
    expect(subs.get(subId)).toMatchObject({ status: "active", cancel_at_period_end: true });
    await webhook(subId);

    expect(await restoreWorkspaceAction(workspace.id)).toEqual({ ok: t.restored });
    expect(subs.get(subId)).toMatchObject({ status: "active", cancel_at_period_end: false });
    expect(await access(workspace.id)).toMatchObject({ kind: "paid", plan: "TEAM" });
    expect(await db.workspace.findUniqueOrThrow({ where: { id: workspace.id } })).toMatchObject({ deletedAt: null, cancelAt: null });
  });

  it("says so when the paid period ran out while it was deleted", async () => {
    const { workspace, subId } = await payingTeam();
    await deleteIt(workspace);
    subs.set(subId, { ...subs.get(subId)!, status: "canceled" }); // the period ended
    await webhook(subId);

    expect(await restoreWorkspaceAction(workspace.id)).toEqual({ ok: t.restoredPlanEnded });
    expect(await access(workspace.id)).toMatchObject({ kind: "free" });
  });

  it("doesn't undo a cancellation the customer made before deleting", async () => {
    const { workspace, subId } = await payingTeam();
    subs.set(subId, { ...subs.get(subId)!, cancel_at_period_end: true }); // cancelled in the portal
    await webhook(subId);
    await deleteIt(workspace);
    await restoreWorkspaceAction(workspace.id);
    expect(subs.get(subId)).toMatchObject({ status: "active", cancel_at_period_end: true });
  });

  it("cancels the subscription when the restore window ends and the workspace goes for good", async () => {
    const { workspace, subId } = await payingTeam();
    await deleteIt(workspace);
    await purgeOldData(new Date(Date.now() + 31 * 86_400_000));
    expect(subs.get(subId)).toMatchObject({ status: "canceled" });
    expect(await db.workspace.findUnique({ where: { id: workspace.id } })).toBeNull();
  });
});
