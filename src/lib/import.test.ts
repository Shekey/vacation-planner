import { describe, expect, it } from "vitest";
import {
  matchRegion,
  parseAllowance,
  parseDateCell,
  parsePeople,
  parseRole,
  parseTable,
  parseTimeOff,
  parseWorkDays,
  spansConflict,
} from "./import";

const regions = [
  { code: "DE-NW", names: ["Nordrhein-Westfalen", "North Rhine-Westphalia"] },
  { code: "DE-BE", names: ["Berlin"] },
];
const opts = { countWeekends: false, regions };

describe("parseTable", () => {
  it("reads Excel paste (tabs), German CSV (semicolons) and English CSV (commas)", () => {
    expect(parseTable("a\tb\n1\t2")).toEqual([["a", "b"], ["1", "2"]]);
    expect(parseTable("a;b\r\n1,5;2")).toEqual([["a", "b"], ["1,5", "2"]]);
    expect(parseTable("a,b\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("handles quotes, a BOM, blank lines and spaces", () => {
    expect(parseTable('﻿name,note\n"Schmidt, Anna","says ""hi"""\n\n  \nBen, x')).toEqual([
      ["name", "note"],
      ["Schmidt, Anna", 'says "hi"'],
      ["Ben", "x"],
    ]);
  });
});

describe("cells", () => {
  it("allowance: decimal comma, units, half days only", () => {
    expect(parseAllowance("28")).toBe(28);
    expect(parseAllowance("28,5")).toBe(28.5);
    expect(parseAllowance("30 Tage")).toBe(30);
    expect(parseAllowance("")).toBeNull();
    for (const bad of ["28.3", "400", "abc", "-1"]) expect(parseAllowance(bad)).toBe("bad");
  });
  it("work days: ranges, lists, German and English names, numbers", () => {
    expect(parseWorkDays("Mo-Do", false)).toEqual([1, 2, 3, 4]);
    expect(parseWorkDays("Mo, Mi, Fr", false)).toEqual([1, 3, 5]);
    expect(parseWorkDays("Mon - Thu", false)).toEqual([1, 2, 3, 4]);
    expect(parseWorkDays("Di bis Sa", true)).toEqual([2, 3, 4, 5, 6]);
    expect(parseWorkDays("1-3", false)).toEqual([1, 2, 3]);
  });
  it("work days: the workspace default comes back empty", () => {
    expect(parseWorkDays("Mo-Fr", false)).toEqual([]);
    expect(parseWorkDays("Vollzeit", false)).toEqual([]);
    expect(parseWorkDays("", false)).toEqual([]);
  });
  it("work days: rejects what it can't read", () => {
    for (const bad of ["Fr-Mo", "xyz", "Mo-Di-Mi", "Mo Hallo"]) expect(parseWorkDays(bad, false)).toBe("bad");
  });
  it("dates: ISO, German, short year, Excel time suffix, unambiguous slashes", () => {
    expect(parseDateCell("2026-11-02")).toBe("2026-11-02");
    expect(parseDateCell("02.11.2026")).toBe("2026-11-02");
    expect(parseDateCell("2.11.26")).toBe("2026-11-02");
    expect(parseDateCell("2026-11-02 00:00:00")).toBe("2026-11-02");
    expect(parseDateCell("13/11/2026")).toBe("2026-11-13");
    expect(parseDateCell("11/13/2026")).toBe("2026-11-13");
    expect(parseDateCell("")).toBeNull();
  });
  it("dates: flags ambiguous and impossible ones", () => {
    expect(parseDateCell("03/04/2026")).toBe("ambiguous");
    expect(parseDateCell("31.02.2026")).toBe("bad");
    expect(parseDateCell("morgen")).toBe("bad");
  });
  it("role", () => {
    expect(parseRole("Admin")).toBe("ADMIN");
    expect(parseRole("Mitglied")).toBe("MEMBER");
    expect(parseRole("")).toBe("MEMBER");
    expect(parseRole("Chef")).toBe("bad");
  });
  it("region by code or name in either language", () => {
    expect(matchRegion("DE-NW", regions)).toBe("DE-NW");
    expect(matchRegion("nordrhein westfalen", regions)).toBe("DE-NW");
    expect(matchRegion("North Rhine-Westphalia", regions)).toBe("DE-NW");
    expect(matchRegion("Mars", regions)).toBeNull();
  });
});

describe("parsePeople", () => {
  it("reads a German Excel export with header", () => {
    const rows = parsePeople(
      "Vorname;Nachname;E-Mail;Urlaubstage;Arbeitstage;Eintritt;Bundesland;Rolle\n" +
        "Anna;Schmidt;Anna@Praxis.de;28,5;Mo-Do;01.03.2024;Nordrhein-Westfalen;Admin\n" +
        "Ben;Meyer;ben@praxis.de;30;Mo-Fr;;;\n",
      opts,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      line: 2,
      email: "anna@praxis.de",
      name: "Anna Schmidt",
      allowance: 28.5,
      workDays: [1, 2, 3, 4],
      employmentStart: "2024-03-01",
      region: "DE-NW",
      role: "ADMIN",
    });
    expect(rows[0].error).toBeUndefined();
    expect(rows[1]).toMatchObject({ allowance: 30, workDays: [], employmentStart: null, region: null, role: "MEMBER" });
  });
  it("reads English headers in any order", () => {
    const [r] = parsePeople("Email,Name,Days\nana@x.de,Ana,25", opts);
    expect(r).toMatchObject({ email: "ana@x.de", name: "Ana", allowance: 25 });
  });
  it("reads rows pasted without a header", () => {
    const rows = parsePeople("Anna Schmidt\tanna@x.de\t28\nBen <ben@x.de>\nclara@x.de", opts);
    expect(rows.map((r) => [r.email, r.name, r.allowance])).toEqual([
      ["anna@x.de", "Anna Schmidt", 28],
      ["ben@x.de", "Ben", null],
      ["clara@x.de", null, null],
    ]);
  });
  it("reports problems per row and keeps going", () => {
    const rows = parsePeople(
      "email,days,start,region,role\n" +
        "a@x.de,28,,,\n" +
        "a@x.de,28,,,\n" +
        "nomail,28,,,\n" +
        ",28,,,\n" +
        "b@x.de,abc,,,\n" +
        "c@x.de,28,03/04/2026,,\n" +
        "d@x.de,28,,Mars,\n" +
        "e@x.de,28,,,Chef\n" +
        "x1@sample.invalid,28,,,\n",
      opts,
    );
    expect(rows.map((r) => r.error?.code)).toEqual([
      undefined,
      "duplicate",
      "badEmail",
      "noEmail",
      "allowance",
      "dateAmbiguous",
      "region",
      "role",
      "sampleEmail",
    ]);
  });
  it("leaves the state column out when the workspace has no holiday country", () => {
    const [r] = parsePeople("email,state\na@x.de,Berlin", { countWeekends: false, regions: null });
    expect(r.error).toBeUndefined();
    expect(r).toMatchObject({ region: null, regionIgnored: true });
  });
  it("returns nothing for empty text", () => expect(parsePeople("  \n ", opts)).toEqual([]));
});

describe("parseTimeOff", () => {
  it("reads ranges with German headers, a half day and a type", () => {
    const rows = parseTimeOff(
      "E-Mail;Von;Bis;Art;Halbtag\n" +
        "anna@x.de;02.11.2026;06.11.2026;Urlaub;\n" +
        "ben@x.de;10.11.2026;;Sonderurlaub;nachmittags\n" +
        "clara@x.de;12.11.2026;;;vormittags\n",
    );
    expect(rows[0]).toMatchObject({ email: "anna@x.de", start: "2026-11-02", end: "2026-11-06", type: "VACATION", startPart: "FULL", endPart: "FULL" });
    expect(rows[1]).toMatchObject({ start: "2026-11-10", end: "2026-11-10", type: "OTHER", startPart: "PM", endPart: "FULL" });
    expect(rows[2]).toMatchObject({ type: "VACATION", startPart: "FULL", endPart: "AM" });
  });
  it("reads rows without a header", () => {
    const [r] = parseTimeOff("anna@x.de\t02.11.2026\t04.11.2026\tUrlaub");
    expect(r).toMatchObject({ email: "anna@x.de", start: "2026-11-02", end: "2026-11-04", type: "VACATION" });
  });
  it("explains what it can't import", () => {
    const rows = parseTimeOff(
      "email,from,to,type,half\n" +
        "a@x.de,2026-11-05,2026-11-02,,\n" +
        "a@x.de,2026-11-02,,sick,\n" +
        "a@x.de,2026-11-02,,sabbatical,\n" +
        "a@x.de,2026-11-02,2026-11-03,,am\n" +
        "a@x.de,,,,\n" +
        "a@x.de,soon,,,\n",
    );
    expect(rows.map((r) => r.error?.code)).toEqual(["endBeforeStart", "sick", "type", "halfRange", "noStart", "date"]);
  });
});

describe("spansConflict", () => {
  const span = (start: string, end: string, startPart: "FULL" | "PM" = "FULL", endPart: "FULL" | "AM" = "FULL") => ({ start, end, startPart, endPart });
  it("sees overlapping days", () => {
    expect(spansConflict(span("2026-11-02", "2026-11-04"), span("2026-11-04", "2026-11-06"))).toBe(true);
    expect(spansConflict(span("2026-11-02", "2026-11-03"), span("2026-11-04", "2026-11-06"))).toBe(false);
  });
  it("lets a morning and an afternoon share a day", () => {
    expect(spansConflict(span("2026-11-04", "2026-11-04", "FULL", "AM"), span("2026-11-04", "2026-11-04", "PM", "FULL"))).toBe(false);
    expect(spansConflict(span("2026-11-04", "2026-11-04", "FULL", "AM"), span("2026-11-04", "2026-11-04"))).toBe(true);
  });
});
