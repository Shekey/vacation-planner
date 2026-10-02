import { describe, expect, it } from "vitest";
import type { BookingSpan } from "./booking-days";
import { peopleOff, understaffedDays } from "./staffing";

const b = (membershipId: string, start: string, end: string, startPart = "FULL", endPart = "FULL") =>
  ({ membershipId, start, end, startPart, endPart }) as BookingSpan & { membershipId: string };
const rules = { countWeekends: false };

describe("peopleOff", () => {
  it("counts half days as half a person", () => {
    expect(peopleOff([b("a", "2026-10-05", "2026-10-05"), b("b", "2026-10-05", "2026-10-05", "FULL", "AM")], "2026-10-05")).toBe(1.5);
  });
});

describe("understaffedDays", () => {
  const team = [b("a", "2026-10-05", "2026-10-06")];
  it("flags days below the minimum", () => {
    const short = understaffedDays({
      candidate: b("c", "2026-10-06", "2026-10-07"),
      team,
      memberCount: 4,
      minPresent: 3,
      rules,
    });
    expect(short).toEqual([{ day: "2026-10-06", present: 2 }]);
  });
  it("is off when no minimum is set", () => {
    expect(understaffedDays({ candidate: b("c", "2026-10-06", "2026-10-06"), team, memberCount: 2, minPresent: null, rules })).toEqual([]);
  });
  it("ignores weekends and holidays", () => {
    const short = understaffedDays({
      candidate: b("c", "2026-10-09", "2026-10-12"),
      team: [b("a", "2026-10-09", "2026-10-12")],
      memberCount: 2,
      minPresent: 1,
      rules: { countWeekends: false, holidays: new Set(["2026-10-12"]) },
    });
    expect(short.map((s) => s.day)).toEqual(["2026-10-09"]);
  });
});
