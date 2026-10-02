import { describe, expect, it } from "vitest";
import { addDays, daysBetween, isISODate, monthBounds, partOfDay, relativeDay, shiftMonth, todayIn } from "./dates";

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

describe("daysBetween and relativeDay", () => {
  it("counts whole days across months", () => {
    expect(daysBetween("2026-10-30", "2026-11-02")).toBe(3);
    expect(daysBetween("2026-11-02", "2026-10-30")).toBe(-3);
  });

  it("reads naturally", () => {
    expect(relativeDay("2026-10-02", "2026-10-02")).toBe("today");
    expect(relativeDay("2026-10-02", "2026-10-03")).toBe("tomorrow");
    expect(relativeDay("2026-10-02", "2026-10-12")).toBe("in 10 days");
  });
});

describe("partOfDay", () => {
  it("uses the workspace time zone", () => {
    const now = new Date("2026-10-02T09:30:00Z");
    expect(partOfDay("UTC", now)).toBe("morning");
    expect(partOfDay("Europe/Berlin", now)).toBe("morning");
    expect(partOfDay("America/Los_Angeles", now)).toBe("morning");
    expect(partOfDay("Asia/Tokyo", now)).toBe("evening");
    expect(partOfDay("Europe/Berlin", new Date("2026-10-02T12:00:00Z"))).toBe("afternoon");
  });
});
