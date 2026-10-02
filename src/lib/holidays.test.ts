import { describe, expect, it } from "vitest";
import { parseNagerHolidays } from "./holidays";

describe("parseNagerHolidays", () => {
  it("keeps nationwide holidays and dedupes dates", () => {
    expect(
      parseNagerHolidays([
        { date: "2026-01-01", localName: "Neujahr", name: "New Year's Day", global: true },
        { date: "2026-01-01", localName: "Duplicate", global: true },
        { date: "not-a-date", localName: "Bad" },
      ]),
    ).toEqual([{ date: "2026-01-01", name: "Neujahr", region: "" }]);
  });

  it("splits regional holidays into one row per state", () => {
    expect(
      parseNagerHolidays([
        { date: "2026-03-08", localName: "Internationaler Frauentag", global: false, counties: ["DE-BE", "DE-MV"] },
        { date: "2026-06-04", localName: "Fronleichnam", global: false, counties: ["DE-NW"] },
        { date: "2026-06-05", localName: "No states listed", global: false, counties: null },
      ]),
    ).toEqual([
      { date: "2026-03-08", name: "Internationaler Frauentag", region: "DE-BE" },
      { date: "2026-03-08", name: "Internationaler Frauentag", region: "DE-MV" },
      { date: "2026-06-04", name: "Fronleichnam", region: "DE-NW" },
    ]);
  });

  it("tolerates junk", () => expect(parseNagerHolidays({})).toEqual([]));
});
