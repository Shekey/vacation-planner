import { describe, expect, it } from "vitest";
import { accessOf, isOverLimit, planFor } from "./plans";

const now = new Date("2026-10-03T12:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

describe("accessOf", () => {
  it("unlocks everything during the trial", () => {
    const a = accessOf({ plan: "FREE", billingStatus: null, trialEndsAt: days(10) }, now);
    expect(a).toMatchObject({ kind: "trial", maxMembers: 50, chat: true, trialDaysLeft: 10 });
  });
  it("drops to Free when the trial ends", () => {
    const a = accessOf({ plan: "FREE", billingStatus: null, trialEndsAt: days(-1) }, now);
    expect(a).toMatchObject({ kind: "free", maxMembers: 5, chat: false });
  });
  it("uses the paid plan while the subscription is live", () => {
    expect(accessOf({ plan: "TEAM", billingStatus: "active", trialEndsAt: null }, now)).toMatchObject({ kind: "paid", maxMembers: 20 });
    expect(accessOf({ plan: "TEAM", billingStatus: "past_due", trialEndsAt: null }, now).kind).toBe("paid");
  });
  it("falls back to Free after cancelling", () =>
    expect(accessOf({ plan: "BUSINESS", billingStatus: "canceled", trialEndsAt: null }, now).kind).toBe("free"));
});

describe("limits", () => {
  it("picks the smallest plan that fits", () => {
    expect([3, 5, 6, 20, 21, 50, 51].map(planFor)).toEqual(["FREE", "FREE", "TEAM", "TEAM", "BUSINESS", "BUSINESS", null]);
  });
  it("flags teams above the plan", () => {
    const free = accessOf({ plan: "FREE", billingStatus: null, trialEndsAt: null }, now);
    expect(isOverLimit(free, 5)).toBe(false);
    expect(isOverLimit(free, 6)).toBe(true);
  });
});
