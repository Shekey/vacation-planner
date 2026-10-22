import { describe, expect, it } from "vitest";
import { looksLikeCalendar, nameFromTitle, parseCalendar } from "./import-ics";

const calendar = (...events: string[]) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Microsoft Corporation//Outlook 16.0 MIMEDIR//EN", ...events, "END:VCALENDAR"].join("\r\n");
const event = (...lines: string[]) => ["BEGIN:VEVENT", ...lines, "END:VEVENT"].join("\r\n");
const from = "2025-01-01";

describe("parseCalendar", () => {
  it("reads all-day events from a shared Outlook calendar, with the name from the title", () => {
    const rows = parseCalendar(
      calendar(
        event("SUMMARY:Urlaub Lena Wagner", "DTSTART;VALUE=DATE:20261221", "DTEND;VALUE=DATE:20270101", "ORGANIZER;CN=Büro:mailto:buero@praxis.de", "X-MICROSOFT-CDO-BUSYSTATUS:OOF"),
        event("SUMMARY:Jürgen – Fortbildung", "DTSTART;VALUE=DATE:20261109", "DTEND;VALUE=DATE:20261111"),
        event("SUMMARY:Anna Urlaub vormittags", "DTSTART;VALUE=DATE:20261113", "DTEND;VALUE=DATE:20261114"),
      ),
      { from },
    );
    expect(rows).toEqual([
      { line: 1, email: "", name: "Lena Wagner", start: "2026-12-21", end: "2026-12-31", startPart: "FULL", endPart: "FULL", type: "VACATION" },
      { line: 2, email: "", name: "Jürgen", start: "2026-11-09", end: "2026-11-10", startPart: "FULL", endPart: "FULL", type: "OTHER" },
      { line: 3, email: "", name: "Anna", start: "2026-11-13", end: "2026-11-13", startPart: "FULL", endPart: "AM", type: "VACATION" },
    ]);
  });

  it("takes the person from the invitation or the organizer when the title only says Urlaub", () => {
    const rows = parseCalendar(
      calendar(
        event("SUMMARY:Urlaub", "DTSTART;VALUE=DATE:20261102", "ORGANIZER;CN=Lena Wagner:mailto:Lena@Praxis.de"),
        event("SUMMARY:Out of office", "DTSTART;VALUE=DATE:20261103", "DTEND;VALUE=DATE:20261104", "ORGANIZER:mailto:buero@praxis.de", 'ATTENDEE;CN="Wagner, Lena";ROLE=REQ-PARTICIPANT:mailto:lena@praxis.de'),
      ),
      { from },
    );
    expect(rows.map((r) => [r.email, r.start, r.end])).toEqual([
      ["lena@praxis.de", "2026-11-02", "2026-11-02"],
      ["lena@praxis.de", "2026-11-03", "2026-11-03"],
    ]);
  });

  it("joins folded lines and unescapes text, as Google Calendar writes it", () => {
    const rows = parseCalendar(
      calendar(event("DTSTART;VALUE=DATE:20261224", "DTEND;VALUE=DATE:20261225", "SUMMARY:Urlaub Schmidt\\, An", " na", "STATUS:CONFIRMED")),
      { from },
    );
    expect(rows[0]).toMatchObject({ name: "Schmidt, Anna", start: "2026-12-24", end: "2026-12-24" });
  });

  it("lists meetings, repeating events and sick days instead of importing them, and drops cancelled, free and old ones", () => {
    const rows = parseCalendar(
      calendar(
        event("SUMMARY:Teammeeting", "DTSTART;TZID=W. Europe Standard Time:20261104T090000", "DTEND;TZID=W. Europe Standard Time:20261104T100000"),
        event("SUMMARY:Geburtstag Lena", "DTSTART;VALUE=DATE:20260512", "RRULE:FREQ=YEARLY"),
        event("SUMMARY:Lena krank", "DTSTART;VALUE=DATE:20261005", "DTEND;VALUE=DATE:20261006"),
        event("SUMMARY:Urlaub Lena", "DTSTART;VALUE=DATE:20261201", "STATUS:CANCELLED"),
        event("SUMMARY:Lena", "DTSTART;VALUE=DATE:20261202", "X-MICROSOFT-CDO-BUSYSTATUS:FREE"),
        event("SUMMARY:Urlaub Lena", "DTSTART;VALUE=DATE:20230801", "DTEND;VALUE=DATE:20230805"),
        event("SUMMARY:Urlaub Lena", "DTSTART:20261207T000000", "DTEND:20261209T000000"),
      ),
      { from },
    );
    expect(rows.map((r) => r.error?.code ?? `${r.start}..${r.end}`)).toEqual(["timed", "recurring", "sick", "2026-12-07..2026-12-08"]);
  });
});

describe("calendar helpers", () => {
  it("spots a calendar file", () => {
    expect(looksLikeCalendar("﻿BEGIN:VCALENDAR\r\nVERSION:2.0")).toBe(true);
    expect(looksLikeCalendar("Name;E-Mail")).toBe(false);
  });
  it("takes the name out of a title", () => {
    expect(nameFromTitle("Urlaub: Schmidt, Anna")).toBe("Schmidt, Anna");
    expect(nameFromTitle("Anna Schmidt (OOO)")).toBe("Anna Schmidt");
    expect(nameFromTitle("Überstundenabbau Jürgen")).toBe("Jürgen");
    expect(nameFromTitle("Urlaub")).toBe("");
  });
});
