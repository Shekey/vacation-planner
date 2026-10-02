import { describe, expect, it } from "vitest";
import { countDays, halfDayLabel, portionOn, validateSpan, type BookingSpan } from "./booking-days";

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
