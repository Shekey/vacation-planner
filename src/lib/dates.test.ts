import { describe, expect, it } from "vitest";
import { addDays, isISODate, monthBounds, shiftMonth, todayIn } from "./dates";

describe("dates", () => {
  it("validates ISO dates", () => {
    expect(isISODate("2026-02-28")).toBe(true);
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("2026-2-3")).toBe(false);
  });
  it("adds days across months", () => expect(addDays("2026-01-31", 1)).toBe("2026-02-01"));
  it("finds month bounds", () => expect(monthBounds("2028-02")).toEqual({ start: "2028-02-01", end: "2028-02-29" }));
  it("shifts months across years", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
  it("uses the workspace timezone for today", () => {
    const now = new Date("2026-10-02T23:30:00Z");
    expect(todayIn("UTC", now)).toBe("2026-10-02");
    expect(todayIn("Europe/Sarajevo", now)).toBe("2026-10-03");
  });
});
