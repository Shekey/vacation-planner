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
  findPerson,
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
    expect(parseRole("Genehmiger:in")).toBe("APPROVER");
    expect(parseRole("Teamleitung")).toBe("APPROVER");
    expect(parseRole("Nur ansehen")).toBe("VIEWER");
    expect(parseRole("Read-only")).toBe("VIEWER");
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
  it("reads days left over from last year", () => {
    const rows = parsePeople("E-Mail;Urlaubstage;Resturlaub\nanna@praxis.de;28;4,5\nben@praxis.de;30;\ncem@praxis.de;30;viel\n", opts);
    expect(rows.map((r) => r.carriedOver)).toEqual([4.5, null, null]);
    expect(rows[2].error).toEqual({ code: "carriedOver", value: "viel" });
  });

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
  it("takes a row with a name and no email as someone without email, once", () => {
    const rows = parsePeople("Name;E-Mail\nMaria Schulz;\nmaria  schulz;\n", opts);
    expect(rows[0]).toMatchObject({ email: "", name: "Maria Schulz" });
    expect(rows[0].error).toBeUndefined();
    expect(rows[1].error?.code).toBe("duplicate");
  });
  it("returns nothing for empty text", () => expect(parsePeople("  \n ", opts)).toEqual([]));
});

describe("parseTimeOff", () => {
  it("reads a name instead of an email, for someone without email", () => {
    const [row] = parseTimeOff("Name;Von;Bis\nMaria Schulz;02.11.2026;06.11.2026\n");
    expect(row).toMatchObject({ email: "", name: "Maria Schulz", start: "2026-11-02", end: "2026-11-06" });
    expect(row.error).toBeUndefined();
  });

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

describe("findPerson", () => {
  const people = [
    { id: "lena", name: "Lena Wagner", email: "lena.wagner@praxis.de" },
    { id: "juergen", name: "Jürgen Müller", email: "jm@praxis.de" },
    { id: "anna-s", name: "Anna Schmidt", email: "anna@praxis.de" },
    { id: "anna-k", name: "Anna Krüger", email: "krueger@praxis.de" },
    { id: "noname", name: null, email: "murat@praxis.de" },
  ];
  it("matches the full name in any order, with or without umlauts", () => {
    expect(findPerson("Lena Wagner", people)).toBe("lena");
    expect(findPerson("Wagner, Lena", people)).toBe("lena");
    expect(findPerson("  lena   WAGNER ", people)).toBe("lena");
    expect(findPerson("Juergen Mueller", people)).toBe("juergen");
    expect(findPerson("Müller, Jürgen", people)).toBe("juergen");
  });
  it("matches a first name, last name or initial when only one person fits", () => {
    expect(findPerson("Lena", people)).toBe("lena");
    expect(findPerson("Krüger", people)).toBe("anna-k");
    expect(findPerson("Anna K.", people)).toBe("anna-k");
  });
  it("says ambiguous when two people fit, and null when nobody does", () => {
    expect(findPerson("Anna", people)).toBe("ambiguous");
    expect(findPerson("Petra", people)).toBeNull();
    expect(findPerson("", people)).toBeNull();
  });
  it("falls back to the part of the email before the @", () => {
    expect(findPerson("Murat", people)).toBe("noname");
  });
});

describe("exports from other tools", () => {
  it("reads a Personio-style absence export: names, status, half days on a range", () => {
    const rows = parseTimeOff(
      [
        "Employee;Absence type;Start date;End date;Half day start;Half day end;Status",
        "Lena Wagner;Paid time off;2026-12-21;2026-12-31;false;true;approved",
        "Lena Wagner;Paid time off;2026-08-03;2026-08-07;false;false;declined",
        "Jürgen Müller;Training;2026-11-09;2026-11-10;;;Approved",
        "Jürgen Müller;Sick leave;2026-10-01;2026-10-02;;;approved",
        "Jürgen Müller;Paid time off;2027-01-04;2027-01-04;;;pending",
      ].join("\n"),
    );
    expect(rows[0]).toMatchObject({ name: "Lena Wagner", email: "", start: "2026-12-21", end: "2026-12-31", startPart: "FULL", endPart: "AM", type: "VACATION" });
    expect(rows[0].error).toBeUndefined();
    expect(rows[1].error).toEqual({ code: "notApproved", value: "declined" });
    expect(rows[2]).toMatchObject({ type: "OTHER" });
    expect(rows[3].error?.code).toBe("sick");
    expect(rows[4].error?.code).toBe("pending");
  });
  it("reads German headers from absence.io-style exports and first/last name columns", () => {
    const rows = parseTimeOff(
      "Vorname\tNachname\tAbwesenheitsart\tStartdatum\tEnddatum\tGenehmigungsstatus\nLena\tWagner\tUrlaub\t21.12.2026\t23.12.2026\tGenehmigt\nAnna\tKrüger\tElternzeit\t01.02.2027\t30.04.2027\tAbgelehnt",
    );
    expect(rows[0]).toMatchObject({ name: "Lena Wagner", start: "2026-12-21", end: "2026-12-23", type: "VACATION" });
    expect(rows[0].error).toBeUndefined();
    expect(rows[1].error).toEqual({ code: "notApproved", value: "Abgelehnt" });
  });
  it("a half day on both ends of one day is just the afternoon", () => {
    const [row] = parseTimeOff("Email,From,To,Half day start,Half day end\nanna@x.de,2026-11-13,2026-11-13,yes,yes");
    expect(row).toMatchObject({ startPart: "PM", endPart: "FULL" });
  });
  it("reads the people lists of Microsoft 365 and Google Workspace", () => {
    const m365 = parsePeople("Block credential,Display name,First name,Last name,User principal name,Department\nFalse,Lena Wagner,Lena,Wagner,lena@praxis.de,Empfang", opts);
    expect(m365[0]).toMatchObject({ email: "lena@praxis.de", name: "Lena Wagner" });
    expect(m365[0].error).toBeUndefined();
    const google = parsePeople("First Name [Required],Last Name [Required],Email Address [Required],Org Unit Path [Required]\nJürgen,Müller,jm@praxis.de,/", opts);
    expect(google[0]).toMatchObject({ email: "jm@praxis.de", name: "Jürgen Müller" });
    const personio = parsePeople("First name;Last name;Email;Hire date;Vacation days\nAnna;Krüger;anna@praxis.de;01.02.2025;30", opts);
    expect(personio[0]).toMatchObject({ employmentStart: "2025-02-01", allowance: 30 });
  });
});
