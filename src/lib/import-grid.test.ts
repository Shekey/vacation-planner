import { describe, expect, it } from "vitest";
import { findGrid, gridMark, parseGrid } from "./import-grid";
import { parseTable } from "./import";

const days = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));
const read = (table: string[][], year = 2026) => {
  const grid = findGrid(table, year);
  if (!grid) throw new Error("no grid");
  return parseGrid(table, grid).map((r) => (r.error ? `${r.name} ${r.error.code} ${r.error.value ?? ""}`.trim() : `${r.name} ${r.start}..${r.end}${r.type === "OTHER" ? " other" : ""}${r.endPart === "AM" ? " am" : ""}${r.startPart === "PM" ? " pm" : ""}`));
};

describe("findGrid and parseGrid", () => {
  it("reads a header of dates (as an .xlsx gives them) and joins a run over the weekend", () => {
    const header = ["Name", "Personalnr.", ...days(14, 31).map((d) => `2026-12-${d}`)];
    const lena = ["Lena Wagner", "17", "", "", "", "", "U", "", "", "U", "U", "U", "½", "", "", "", "U", "U", "U", "U"];
    expect(read([header, lena])).toEqual(["Lena Wagner 2026-12-18..2026-12-23", "Lena Wagner 2026-12-24..2026-12-24 am", "Lena Wagner 2026-12-28..2026-12-31"]);
  });

  it("reads day numbers under month headings, the year from the title, and skips weekday and sum rows", () => {
    const table = [
      ["Urlaubsplaner 2027"],
      ["", "Januar", ...Array(30).fill(""), "Februar"],
      ["Mitarbeiter", ...days(1, 31), ...days(1, 28)],
      ["", "Fr", "Sa", "So", "Mo"],
      ["Wagner, Lena", "", "", "", "U", "U", ...Array(26).fill(""), "FB", "FB"],
      ["Jürgen", ...Array(9).fill(""), "K", "K"],
      ["Summe", "1", "", "", "2"],
    ];
    expect(read(table)).toEqual(["Wagner, Lena 2027-01-04..2027-01-05", "Wagner, Lena 2027-02-01..2027-02-02 other", "Jürgen sick"]);
  });

  it("counts months on when day numbers start over and there are no month names", () => {
    const table = [["Name", ...days(1, 31), ...days(1, 28)], ["Anna", ...Array(31).fill(""), "U", "nm"]];
    expect(read(table)).toEqual(["Anna 2026-02-01..2026-02-01", "Anna 2026-02-02..2026-02-02 pm"]);
  });

  it("reads a pasted month sheet with dates written without the year", () => {
    const table = parseTable(["Dezember 2026", ["Name", ...days(1, 10).map((d) => `${d.padStart(2, "0")}.12.`)].join("\t"), ["Ben", "", "U", "Urlaub", "x"].join("\t")].join("\n"));
    expect(read(table)).toEqual(["Ben 2026-12-02..2026-12-04"]);
  });

  it("lists marks it doesn't know once per person instead of guessing", () => {
    const table = [["Name", ...days(1, 10).map((d) => `2026-03-${d.padStart(2, "0")}`)], ["Anna", "U", "Q", "Q", "8"]];
    expect(read(table)).toEqual(["Anna gridMark Q", "Anna gridMark 8", "Anna 2026-03-01..2026-03-01"]);
  });

  it("isn't fooled by an ordinary list", () => {
    expect(findGrid(parseTable("Name;E-Mail;Von;Bis\nAnna;anna@x.de;01.12.2026;05.12.2026"), 2026)).toBeNull();
    expect(findGrid(parseTable("Name;Urlaubstage\nAnna;28\nBen;30"), 2026)).toBeNull();
  });
});

describe("gridMark", () => {
  it("knows the usual marks", () => {
    expect(["U", "urlaub", "X", "1"].map(gridMark)).toEqual(["FULL", "FULL", "FULL", "FULL"]);
    expect(["½", "0,5", "U/2"].map(gridMark)).toEqual(["HALF", "HALF", "HALF"]);
    expect(["FB", "SU", "ÜA"].map(gridMark)).toEqual(["OTHER", "OTHER", "OTHER"]);
    expect(["K", "krank"].map(gridMark)).toEqual(["SICK", "SICK"]);
    expect(gridMark("Q")).toBeNull();
  });
});

describe("readTimeOff", () => {
  it("tells a calendar, a planner and a list apart", async () => {
    const { readTimeOff } = await import("./import-time-off");
    expect(readTimeOff("BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Urlaub Anna\nDTSTART;VALUE=DATE:20261201\nEND:VEVENT\nEND:VCALENDAR", "2026-10-22").source).toBe("calendar");
    expect(readTimeOff(["Name", ...days(1, 10).map((d) => `${d}.12.2026`)].join("\t") + "\nAnna\tU", "2026-10-22")).toMatchObject({ source: "planner", rows: [{ name: "Anna", start: "2026-12-01" }] });
    expect(readTimeOff("Name;Von;Bis\nAnna;01.12.2026;05.12.2026", "2026-10-22").source).toBe("list");
  });
});
