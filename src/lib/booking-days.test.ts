import { describe, expect, it } from "vitest";
import {
  carriedOverStatus,
  carryOver,
  countDays,
  halfDayLabel,
  isMonthDay,
  normalizeWorkDays,
  portionOn,
  proratedAllowance,
  validateSpan,
  type BookingSpan,
} from "./booking-days";

const span = (start: string, end: string, startPart = "FULL", endPart = "FULL") =>
  ({ start, end, startPart, endPart }) as BookingSpan;
const weekdays = { countWeekends: false };

describe("countDays", () => {
  // 2026-10-05 is a Monday.
  it("counts a working week", () => expect(countDays(span("2026-10-05", "2026-10-09"), weekdays)).toBe(5));
  it("skips weekends", () => expect(countDays(span("2026-10-05", "2026-10-12"), weekdays)).toBe(6));
  it("counts weekends when enabled", () =>
    expect(countDays(span("2026-10-05", "2026-10-12"), { countWeekends: true })).toBe(8));
  it("counts a weekend-only booking as zero", () => expect(countDays(span("2026-10-10", "2026-10-11"), weekdays)).toBe(0));
  it("counts half days", () => {
    expect(countDays(span("2026-10-05", "2026-10-05", "FULL", "AM"), weekdays)).toBe(0.5);
    expect(countDays(span("2026-10-05", "2026-10-05", "PM", "FULL"), weekdays)).toBe(0.5);
    expect(countDays(span("2026-10-05", "2026-10-07", "PM", "AM"), weekdays)).toBe(2);
  });
  it("does not subtract a half day that falls on a weekend", () =>
    expect(countDays(span("2026-10-09", "2026-10-11", "FULL", "AM"), weekdays)).toBe(1));
  it("skips public holidays", () =>
    expect(countDays(span("2026-10-05", "2026-10-09"), { countWeekends: false, holidays: new Set(["2026-10-07"]) })).toBe(4));
  it("clips to a window", () => {
    const s = span("2026-12-28", "2027-01-08");
    expect(countDays(s, weekdays, { from: "2026-01-01", to: "2026-12-31" })).toBe(4);
    expect(countDays(s, weekdays, { from: "2027-01-01", to: "2027-12-31" })).toBe(6);
    expect(countDays(s, weekdays, { from: "2028-01-01", to: "2028-12-31" })).toBe(0);
  });
});

describe("portionOn", () => {
  const s = span("2026-10-05", "2026-10-07", "PM", "AM");
  it("marks partial first and last days", () => {
    expect(portionOn(s, "2026-10-05")).toBe("PM");
    expect(portionOn(s, "2026-10-06")).toBe("FULL");
    expect(portionOn(s, "2026-10-07")).toBe("AM");
    expect(portionOn(s, "2026-10-08")).toBeNull();
  });
});

describe("validateSpan", () => {
  const opts = { allowHalfDays: true };
  it("accepts valid spans", () => {
    expect(validateSpan(span("2026-10-05", "2026-10-05", "FULL", "AM"), opts)).toBeNull();
    expect(validateSpan(span("2026-10-05", "2026-10-06", "PM", "AM"), opts)).toBeNull();
  });
  it("rejects reversed dates", () => expect(validateSpan(span("2026-10-06", "2026-10-05"), opts)).not.toBeNull());
  it("rejects PM start and AM end on one day", () =>
    expect(validateSpan(span("2026-10-05", "2026-10-05", "PM", "AM"), opts)).not.toBeNull());
  it("rejects half days when disabled", () =>
    expect(validateSpan(span("2026-10-05", "2026-10-05", "FULL", "AM"), { allowHalfDays: false })).not.toBeNull());
});

describe("halfDayLabel", () => {
  it("labels single half days", () => {
    expect(halfDayLabel(span("2026-10-05", "2026-10-05", "FULL", "AM"))).toBe("morning");
    expect(halfDayLabel(span("2026-10-05", "2026-10-05", "PM", "FULL"))).toBe("afternoon");
    expect(halfDayLabel(span("2026-10-05", "2026-10-05"))).toBeNull();
  });
});

describe("carryOver", () => {
  it("carries unused days up to the cap", () => {
    expect(carryOver(20, 12, 5)).toBe(5);
    expect(carryOver(20, 18, 5)).toBe(2);
  });
  it("never goes negative or applies without a cap", () => {
    expect(carryOver(20, 25, 5)).toBe(0);
    expect(carryOver(20, 0, null)).toBe(0);
  });
});

describe("part-time work days", () => {
  const monToThu = { countWeekends: false, workDays: [1, 2, 3, 4] };
  it("charges only the days the person works", () => expect(countDays(span("2026-10-05", "2026-10-11"), monToThu)).toBe(4));
  it("charges nothing on a day off", () => expect(countDays(span("2026-10-09", "2026-10-09"), monToThu)).toBe(0));
  it("can include a weekend work day", () =>
    expect(countDays(span("2026-10-05", "2026-10-11"), { countWeekends: false, workDays: [6, 7] })).toBe(2));
  it("still skips holidays", () =>
    expect(countDays(span("2026-10-05", "2026-10-09"), { ...monToThu, holidays: new Set(["2026-10-06"]) })).toBe(3));
  it("falls back to the weekend rule when empty", () => expect(countDays(span("2026-10-05", "2026-10-11"), { countWeekends: false, workDays: [] })).toBe(5));
  it("normalizes form input", () => {
    expect(normalizeWorkDays([4, 1, 2, 2, 9, 3], false)).toEqual([1, 2, 3, 4]);
    expect(normalizeWorkDays([5, 4, 3, 2, 1], false)).toEqual([]);
    expect(normalizeWorkDays([1, 2, 3, 4, 5], true)).toEqual([1, 2, 3, 4, 5]);
    expect(normalizeWorkDays([1, 2, 3, 4, 5, 6, 7], true)).toEqual([]);
  });
});

describe("proratedAllowance", () => {
  it("keeps the full allowance when employed before the year", () => expect(proratedAllowance(30, "2020-05-10", 2026)).toBe(30));
  it("keeps the full allowance without a start date", () => expect(proratedAllowance(30, null, 2026)).toBe(30));
  it("counts the start month when starting on the 1st", () => expect(proratedAllowance(30, "2026-07-01", 2026)).toBe(15));
  it("skips a partial start month", () => expect(proratedAllowance(30, "2026-07-15", 2026)).toBe(12.5));
  it("rounds up to a half day", () => expect(proratedAllowance(28, "2026-10-01", 2026)).toBe(7));
  it("gives nothing before employment starts", () => expect(proratedAllowance(30, "2027-02-01", 2026)).toBe(0));
  it("gives a full year after the start year", () => expect(proratedAllowance(30, "2026-07-15", 2027)).toBe(30));
});

describe("carriedOverStatus", () => {
  it("keeps unused carried days usable before the deadline", () =>
    expect(carriedOverStatus(5, 2, false)).toEqual({ used: 2, left: 3, expired: 0 }));
  it("expires what wasn't taken by the deadline", () =>
    expect(carriedOverStatus(5, 2, true)).toEqual({ used: 2, left: 0, expired: 3 }));
  it("uses carried days first, so taking more than them loses nothing", () =>
    expect(carriedOverStatus(5, 8, true)).toEqual({ used: 5, left: 0, expired: 0 }));
  it("counts half days", () => expect(carriedOverStatus(2, 1.5, true)).toEqual({ used: 1.5, left: 0, expired: 0.5 }));
});

describe("isMonthDay", () => {
  it("accepts real days", () => {
    expect(isMonthDay("03-31")).toBe(true);
    expect(isMonthDay("12-31")).toBe(true);
    expect(isMonthDay("02-28")).toBe(true);
  });
  it("rejects days that don't exist every year", () => {
    expect(isMonthDay("02-29")).toBe(false);
    expect(isMonthDay("04-31")).toBe(false);
    expect(isMonthDay("13-01")).toBe(false);
    expect(isMonthDay("3-31")).toBe(false);
  });
});
