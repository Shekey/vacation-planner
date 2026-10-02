import { describe, expect, it } from "vitest";
import { buildCalendar } from "./ical";

describe("buildCalendar", () => {
  const ics = buildCalendar(
    "Design, Team",
    [{ uid: "b1", start: "2026-12-31", end: "2027-01-02", summary: "Mia; vacation", description: "line1\nline2" }],
    new Date("2026-10-02T12:00:00Z"),
  );
  it("uses exclusive all-day end dates", () => {
    expect(ics).toContain("DTSTART;VALUE=DATE:20261231");
    expect(ics).toContain("DTEND;VALUE=DATE:20270103");
  });
  it("escapes text", () => {
    expect(ics).toContain("X-WR-CALNAME:Design\\, Team");
    expect(ics).toContain("SUMMARY:Mia\; vacation");
    expect(ics).toContain("DESCRIPTION:line1\\nline2");
  });
  it("uses CRLF line endings", () => {
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
  it("folds long lines", () => {
    const long = buildCalendar("x", [{ uid: "u", start: "2026-01-01", end: "2026-01-01", summary: "a".repeat(200) }]);
    for (const line of long.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  });
});
