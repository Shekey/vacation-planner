import { describe, expect, it } from "vitest";
import { parseNagerHolidays } from "./holidays";

describe("parseNagerHolidays", () => {
  it("keeps nationwide holidays and dedupes dates", () => {
    expect(
      parseNagerHolidays([
        { date: "2026-01-01", localName: "Nova godina", name: "New Year's Day", global: true },
        { date: "2026-01-01", localName: "Duplicate", global: true },
        { date: "2026-03-01", localName: "Regional", global: false, counties: ["BA-BIH"] },
        { date: "not-a-date", localName: "Bad" },
      ]),
    ).toEqual([{ date: "2026-01-01", name: "Nova godina" }]);
  });
  it("tolerates junk", () => expect(parseNagerHolidays({})).toEqual([]));
});
