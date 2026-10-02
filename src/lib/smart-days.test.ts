import { describe, expect, it } from "vitest";
import { daysAtRisk, longWeekendTips } from "./smart-days";

// October 2026: the 1st is a Thursday, the 5th a Monday.
const rules = (...holidays: string[]) => ({ countWeekends: false, holidays: new Set(holidays) });

describe("longWeekendTips", () => {
  it("bridges a Thursday holiday to the weekend", () => {
    expect(longWeekendTips({ from: "2026-10-01", to: "2026-10-31", rules: rules("2026-10-15") })).toEqual([
      { start: "2026-10-15", end: "2026-10-18", bookFrom: "2026-10-16", bookTo: "2026-10-16", cost: 1, length: 4, holiday: "2026-10-15" },
    ]);
  });

  it("bridges a Tuesday holiday back to the weekend", () => {
    const [tip] = longWeekendTips({ from: "2026-10-01", to: "2026-10-31", rules: rules("2026-10-13") });
    expect(tip).toMatchObject({ start: "2026-10-10", end: "2026-10-13", bookFrom: "2026-10-12", cost: 1, length: 4 });
  });

  it("offers both two-day bridges around a Wednesday holiday", () => {
    const tips = longWeekendTips({ from: "2026-10-01", to: "2026-10-31", rules: rules("2026-10-14") });
    expect(tips.map((t) => [t.bookFrom, t.bookTo, t.cost, t.length])).toEqual([
      ["2026-10-12", "2026-10-13", 2, 5],
      ["2026-10-15", "2026-10-16", 2, 5],
    ]);
  });

  it("skips plain weekends, holidays already next to a weekend, and booked bridges", () => {
    expect(longWeekendTips({ from: "2026-10-01", to: "2026-10-31", rules: rules() })).toEqual([]);
    expect(longWeekendTips({ from: "2026-10-01", to: "2026-10-31", rules: rules("2026-10-16") })).toEqual([]);
    expect(
      longWeekendTips({ from: "2026-10-01", to: "2026-10-31", rules: rules("2026-10-15"), alreadyOff: new Set(["2026-10-16"]) }),
    ).toEqual([]);
  });

  it("only returns bridges that start inside the window", () => {
    expect(longWeekendTips({ from: "2026-10-17", to: "2026-10-31", rules: rules("2026-10-15") })).toEqual([]);
  });
});

describe("daysAtRisk", () => {
  it("is what's left beyond the carry-over cap", () => {
    expect(daysAtRisk(8, 5)).toBe(3);
    expect(daysAtRisk(4, 5)).toBe(0);
    expect(daysAtRisk(6, null)).toBe(6);
    expect(daysAtRisk(null, 5)).toBe(0);
    expect(daysAtRisk(-1, 0)).toBe(0);
  });
});
