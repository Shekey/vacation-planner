import { describe, expect, it } from "vitest";
import { countDays } from "./booking-days";
import { eachDay, isWeekend } from "./dates";
import { isSampleEmail, sampleBookingRows, sampleBookings, sampleEmail, samplePeople } from "./sample-team";
import { TEAM_TYPE_KEYS } from "./team-types";

const today = "2026-10-14"; // a Wednesday

describe("sample emails", () => {
  it("are unroutable and recognised", () => {
    const email = sampleEmail();
    expect(email).toMatch(/^[a-z0-9_-]+@sample\.invalid$/);
    expect(isSampleEmail(email)).toBe(true);
    expect(isSampleEmail(" X@Sample.Invalid ")).toBe(true);
    expect(isSampleEmail("anna@sample.invalid.de")).toBe(false);
    expect(isSampleEmail("anna@praxis.de")).toBe(false);
  });
  it("are different each time", () => expect(sampleEmail()).not.toBe(sampleEmail()));
});

describe("samplePeople", () => {
  it("gives six people for every team type", () => {
    for (const type of [...TEAM_TYPE_KEYS, null, "unknown"]) expect(samplePeople(type, "en")).toHaveLength(6);
  });
  it("names roles that fit the team, in the workspace language", () => {
    expect(samplePeople("practice", "de")).toContain("Marie Schmitt (Empfang)");
    expect(samplePeople("practice", "en")).toContain("Marie Schmitt (Reception)");
  });
  it("uses plain names when the team type is unknown", () => {
    expect(samplePeople(null, "de")[0]).toBe("Anna Becker");
    expect(samplePeople("office", "en")[0]).toBe("Anna Becker");
  });
});

describe("sampleBookings", () => {
  const withApprovals = sampleBookings(today, { approvalsEnabled: true, allowHalfDays: true });

  it("stays within the next six weeks on weekdays", () => {
    for (const b of withApprovals) {
      expect(b.start >= today).toBe(true);
      expect(b.end <= "2026-11-25").toBe(true);
      expect(isWeekend(b.start) || isWeekend(b.end)).toBe(false);
    }
  });
  it("has someone off today", () => expect(withApprovals.some((b) => b.start === today)).toBe(true));
  it("starts on Monday when today is a weekend", () => {
    expect(sampleBookings("2026-10-17", { approvalsEnabled: false, allowHalfDays: true })[0].start).toBe("2026-10-19");
  });
  it("has one pending request only when approvals are on", () => {
    expect(withApprovals.filter((b) => b.status === "PENDING")).toHaveLength(1);
    expect(sampleBookings(today, { approvalsEnabled: false, allowHalfDays: true }).every((b) => b.status === "APPROVED")).toBe(true);
  });
  it("includes half days unless the workspace turned them off", () => {
    const halves = (bs: typeof withApprovals) => bs.filter((b) => b.startPart !== "FULL" || b.endPart !== "FULL");
    expect(halves(withApprovals).length).toBeGreaterThanOrEqual(2);
    expect(halves(sampleBookings(today, { approvalsEnabled: true, allowHalfDays: false }))).toHaveLength(0);
  });
  it("never overlaps one person's bookings", () => {
    for (let person = 0; person < 6; person++) {
      const days = withApprovals.filter((b) => b.person === person).flatMap((b) => eachDay(b.start, b.end));
      expect(new Set(days).size).toBe(days.length);
    }
  });
  it("covers all six people", () => expect(new Set(withApprovals.map((b) => b.person)).size).toBe(6));
});

describe("sampleBookingRows", () => {
  const bookings = sampleBookings(today, { approvalsEnabled: false, allowHalfDays: true });
  const ids = ["a", "b", "c", "d", "e", "f"];

  it("counts days like a real booking", () => {
    const rows = sampleBookingRows(bookings, ids, { countWeekends: false, holidays: new Set() });
    expect(rows).toHaveLength(bookings.length);
    rows.forEach((r, i) => expect(r.daysCount).toBe(countDays(bookings[i], { countWeekends: false })));
    expect(rows[0]).toMatchObject({ membershipId: "a", daysCount: 2 });
  });
  it("drops bookings that fall entirely on holidays", () => {
    const rows = sampleBookingRows(bookings, ids, { countWeekends: false, holidays: new Set([today, "2026-10-15"]) });
    expect(rows).toHaveLength(bookings.length - 1);
  });
});
