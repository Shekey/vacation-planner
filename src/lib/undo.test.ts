import { describe, expect, it } from "vitest";
import { auditCutoff, canRestore, restoreCutoff, restoreDaysLeft, RESTORE_DAYS } from "./undo";

const now = new Date("2026-10-18T12:00:00Z");
const ago = (days: number) => new Date(now.getTime() - days * 86_400_000);

describe("canRestore", () => {
  it("allows restoring for 30 days", () => {
    expect(canRestore(ago(0), now)).toBe(true);
    expect(canRestore(ago(29.9), now)).toBe(true);
    expect(canRestore(ago(30.1), now)).toBe(false);
  });
  it("refuses when nobody knows when it happened", () => {
    expect(canRestore(null, now)).toBe(false);
    expect(canRestore(undefined, now)).toBe(false);
  });
});

describe("restoreDaysLeft", () => {
  it("counts down and rounds up", () => {
    expect(restoreDaysLeft(ago(0), now)).toBe(RESTORE_DAYS);
    expect(restoreDaysLeft(ago(29.5), now)).toBe(1);
    expect(restoreDaysLeft(ago(40), now)).toBe(0);
  });
});

describe("cutoffs", () => {
  it("restoreCutoff is the oldest thing that can still be restored", () => {
    expect(canRestore(new Date(restoreCutoff(now).getTime() + 1000), now)).toBe(true);
    expect(canRestore(restoreCutoff(now), now)).toBe(false);
  });
  it("audit events are kept for a year", () => expect(auditCutoff(now).toISOString()).toBe("2025-10-18T12:00:00.000Z"));
});
