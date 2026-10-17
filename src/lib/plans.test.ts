import { describe, expect, it } from "vitest";
import { messagesFor } from "./i18n";
import { accessOf, isOverLimit, planFor, shouldSyncSubscription, trialReminderDue } from "./plans";

const now = new Date("2026-10-03T12:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

describe("accessOf", () => {
  it("unlocks everything during the trial", () => {
    const a = accessOf({ plan: "FREE", billingStatus: null, trialEndsAt: days(10) }, now);
    expect(a).toMatchObject({ kind: "trial", maxMembers: 75, chat: true, trialDaysLeft: 10 });
  });
  it("drops to Free when the trial ends", () => {
    const a = accessOf({ plan: "FREE", billingStatus: null, trialEndsAt: days(-1) }, now);
    expect(a).toMatchObject({ kind: "free", maxMembers: 5, chat: false });
  });
  it("uses the paid plan while the subscription is live", () => {
    expect(accessOf({ plan: "TEAM", billingStatus: "active", trialEndsAt: null }, now)).toMatchObject({ kind: "paid", maxMembers: 25 });
    expect(accessOf({ plan: "TEAM", billingStatus: "past_due", trialEndsAt: null }, now).kind).toBe("paid");
  });
  it("falls back to Free after cancelling", () =>
    expect(accessOf({ plan: "BUSINESS", billingStatus: "canceled", trialEndsAt: null }, now).kind).toBe("free"));
});

describe("limits", () => {
  it("picks the smallest plan that fits", () => {
    expect([3, 5, 6, 25, 26, 75, 76].map(planFor)).toEqual(["FREE", "FREE", "TEAM", "TEAM", "BUSINESS", "BUSINESS", null]);
  });
  it("flags teams above the plan", () => {
    const free = accessOf({ plan: "FREE", billingStatus: null, trialEndsAt: null }, now);
    expect(isOverLimit(free, 5)).toBe(false);
    expect(isOverLimit(free, 6)).toBe(true);
  });
});

describe("trialReminderDue", () => {
  const trial = (left: number, sent: { first?: boolean; last?: boolean } = {}) => ({
    plan: "FREE" as const,
    billingStatus: null,
    trialEndsAt: new Date(now.getTime() + left * 86_400_000),
    trialReminder7SentAt: sent.first ? now : null,
    trialReminder1SentAt: sent.last ? now : null,
  });

  it("says nothing early in the trial", () => expect(trialReminderDue(trial(8), now)).toBeNull());
  it("sends the first reminder a week before the end, once", () => {
    expect(trialReminderDue(trial(7), now)).toBe("first");
    expect(trialReminderDue(trial(3.5), now)).toBe("first");
    expect(trialReminderDue(trial(7, { first: true }), now)).toBeNull();
  });
  it("sends the last reminder in the final two days, once", () => {
    expect(trialReminderDue(trial(1.9, { first: true }), now)).toBe("last");
    expect(trialReminderDue(trial(0.2, { first: true }), now)).toBe("last");
    expect(trialReminderDue(trial(1, { first: true, last: true }), now)).toBeNull();
  });
  it("skips straight to the last reminder when the first was missed", () => expect(trialReminderDue(trial(1), now)).toBe("last"));
  it("stops once the trial is over or paid for", () => {
    expect(trialReminderDue(trial(-0.1), now)).toBeNull();
    expect(trialReminderDue({ ...trial(5), plan: "TEAM", billingStatus: "active" }, now)).toBeNull();
  });
  it("still reminds when a subscription was cancelled during the trial", () =>
    expect(trialReminderDue({ ...trial(5), plan: "TEAM", billingStatus: "canceled" }, now)).toBe("first"));
});

describe("shouldSyncSubscription", () => {
  const live = { stripeSubscriptionId: "sub_new", billingStatus: "active" };
  it("follows the workspace's own subscription, including cancelling", () => {
    expect(shouldSyncSubscription(live, { id: "sub_new", status: "canceled" })).toBe(true);
    expect(shouldSyncSubscription({ stripeSubscriptionId: null, billingStatus: null }, { id: "sub_1", status: "incomplete" })).toBe(true);
  });
  it("ignores an older subscription ending after a newer one went live", () => {
    expect(shouldSyncSubscription(live, { id: "sub_old", status: "incomplete_expired" })).toBe(false);
    expect(shouldSyncSubscription(live, { id: "sub_old", status: "canceled" })).toBe(false);
  });
  it("takes a new live subscription over an ended one", () => {
    expect(shouldSyncSubscription({ stripeSubscriptionId: "sub_old", billingStatus: "canceled" }, { id: "sub_new", status: "active" })).toBe(true);
    expect(shouldSyncSubscription(live, { id: "sub_other", status: "active" })).toBe(true);
  });
});

describe("trial reminder email", () => {
  const base = { workspace: "Praxis Sonne", date: "Monday, 16 November", freeMax: 5, billingUrl: "https://x/w/p/billing", contact: "hi@x.de" };
  it("says nothing is deleted and links to Billing, in both languages", () => {
    for (const locale of ["en", "de"] as const) {
      const text = messagesFor(locale).email.trialEnding.text({ ...base, people: 3 });
      expect(text).toContain(locale === "en" ? "Nothing is deleted" : "Es wird nichts gelöscht");
      expect(text).toContain("https://x/w/p/billing");
    }
  });
  it("explains the pause only to teams over the free limit", () => {
    const t = messagesFor("de").email.trialEnding;
    expect(t.text({ ...base, people: 8 })).toContain("Einladungen sind pausiert");
    expect(t.text({ ...base, people: 3 })).toContain("kostenlos weitermachen");
  });
});
