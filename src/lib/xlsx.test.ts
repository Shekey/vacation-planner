import { readFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { parsePeople, parseTimeOff } from "./import";
import { bestSheet, isDateFormat, looksLikeOldExcel, looksLikeZip, readCalendarsInZip, readWorkbook, serialToISO, toTabText } from "./xlsx";

/** A minimal zip (deflated entries, no CRC check on read) holding the given files. */
function zip(files: Record<string, string>): Uint8Array {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const data = deflateRawSync(Buffer.from(text));
    const nameBytes = Buffer.from(name);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(8, 8);
    head.writeUInt32LE(data.length, 18);
    head.writeUInt16LE(nameBytes.length, 26);
    local.push(head, nameBytes, data);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(8, 10);
    dir.writeUInt32LE(data.length, 20);
    dir.writeUInt16LE(nameBytes.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const dirBytes = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(dirBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...local, dirBytes, end]));
}

const workbook = (sheet: string, extra: Record<string, string> = {}) =>
  zip({
    "xl/workbook.xml": `<workbook><sheets><sheet name="Team" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": `<worksheet><sheetData>${sheet}</sheetData></worksheet>`,
    ...extra,
  });

describe("readWorkbook", () => {
  it("reads a file saved by LibreOffice: shared strings, dates, formulas, gaps, hidden sheets", async () => {
    const sheets = await readWorkbook(readFileSync(new URL("../test/fixtures/team.xlsx", import.meta.url)));
    expect(sheets.map((s) => s.name)).toEqual(["Mitarbeiter", "Urlaub 2026"]);
    expect(sheets[0].rows).toEqual([
      ["Name", "E-Mail", "Urlaubstage", "Eintritt", "Notiz"],
      ["Jürgen Müller", "juergen@beispiel.de", "28.5", "2024-03-01", 'sagt "hallo"\tund tschüss'],
      ["Schmidt, Anna", "anna@beispiel.de", "30", "2025-01-15"],
      ["Ben Meyer", "", "30"],
    ]);
    expect(sheets[1].rows).toEqual([
      ["Name", "Von", "Bis"],
      ["Jürgen Müller", "2026-12-21", "2026-12-31"],
    ]);
  });

  it("feeds the usual import: people and time off read the same as a paste", async () => {
    const [people, timeOff] = await readWorkbook(readFileSync(new URL("../test/fixtures/team.xlsx", import.meta.url)));
    const rows = parsePeople(toTabText(people.rows), { countWeekends: false, regions: null });
    expect(rows[0]).toMatchObject({ email: "juergen@beispiel.de", name: "Jürgen Müller", allowance: 28.5, employmentStart: "2024-03-01" });
    expect(rows[1]).toMatchObject({ email: "anna@beispiel.de", name: "Schmidt, Anna", allowance: 30 });
    const off = parseTimeOff(toTabText([["E-Mail", ...timeOff.rows[0].slice(1)], ["juergen@beispiel.de", ...timeOff.rows[1].slice(1)]]));
    expect(off[0]).toMatchObject({ start: "2026-12-21", end: "2026-12-31", type: "VACATION" });
    expect(off[0].error).toBeUndefined();
  });

  it("reads inline strings, rich text runs, entities and cells without a reference", async () => {
    const sheets = await readWorkbook(
      workbook(
        `<row r="1"><c t="inlineStr"><is><t>A &amp; B</t></is></c><c t="s"><v>0</v></c></row>` +
          `<row r="3"><c r="C3" t="str"><f>A1</f><v>=x</v></c><c r="D3" t="b"><v>1</v></c><c r="E3" t="e"><v>#REF!</v></c></row>`,
        {
          "xl/sharedStrings.xml": `<sst><si><r><t>Ur</t></r><r><rPr/><t xml:space="preserve">laub </t></r><rPh><t>ignored</t></rPh></si></sst>`,
        },
      ),
    );
    expect(sheets[0].rows).toEqual([
      ["A & B", "Urlaub"],
      ["", "", "=x", "TRUE"],
    ]);
  });

  it("turns numbers into dates only where the cell style is a date", async () => {
    const styles = `<styleSheet><numFmts><numFmt numFmtId="164" formatCode="[$-407]DD.MM.YYYY"/><numFmt numFmtId="165" formatCode="0.0&quot; Tage&quot;"/></numFmts>
      <cellXfs><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/><xf numFmtId="165"/></cellXfs></styleSheet>`;
    const sheets = await readWorkbook(
      workbook(`<row r="1"><c r="A1"><v>46000</v></c><c r="B1" s="1"><v>46000</v></c><c r="C1" s="2"><v>46000.75</v></c><c r="D1" s="3"><v>28.5</v></c></row>`, {
        "xl/styles.xml": styles,
      }),
    );
    expect(sheets[0].rows).toEqual([["46000", "2025-12-09", "2025-12-09", "28.5"]]);
  });

  it("rejects files that aren't workbooks", async () => {
    await expect(readWorkbook(new TextEncoder().encode("Name;E-Mail"))).rejects.toThrow();
    await expect(readWorkbook(zip({ "word/document.xml": "<w/>" }))).rejects.toThrow("not an Excel workbook");
  });
});

describe("cells", () => {
  it("Excel day numbers, including around the 1900 leap-year bug and the 1904 system", () => {
    expect(serialToISO(1)).toBe("1900-01-01");
    expect(serialToISO(59)).toBe("1900-02-28");
    expect(serialToISO(61)).toBe("1900-03-01");
    expect(serialToISO(45658)).toBe("2025-01-01");
    expect(serialToISO(0, true)).toBe("1904-01-01");
  });
  it("date formats", () => {
    for (const f of ["dd.mm.yyyy", "d. mmmm yy", "[$-407]DD.MM.YYYY", "yyyy-mm-dd hh:mm"]) expect(isDateFormat(f)).toBe(true);
    for (const f of ["0.0", '#,##0 "Tage"', "hh:mm", "General", "[Red]0"]) expect(isDateFormat(f)).toBe(false);
  });
  it("tab text quotes only what needs it", () => {
    expect(toTabText([["a", 'b"c', "d\te"], ["x"]])).toBe('a\t"b""c"\t"d\te"\nx');
  });
  it("spots a zip by its first bytes", () => {
    expect(looksLikeZip(zip({ a: "b" }))).toBe(true);
    expect(looksLikeZip(new TextEncoder().encode("Name;E-Mail"))).toBe(false);
    expect(looksLikeOldExcel(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1]))).toBe(true);
  });
});

describe("bestSheet", () => {
  const sheets = [
    { name: "Deckblatt", rows: [] },
    { name: "Mitarbeiter", rows: [["Name"]] },
    { name: "Urlaub 2026", rows: [["Name"]] },
  ];
  it("prefers a sheet named for what is imported, else the first with rows", () => {
    expect(bestSheet(sheets, /urlaub|absence/i)).toBe(2);
    expect(bestSheet(sheets, /team|people/i)).toBe(1);
    expect(bestSheet([], /x/)).toBe(0);
  });
});

describe("readCalendarsInZip", () => {
  it("joins the calendars of a Google Calendar export and ignores other files", async () => {
    const text = await readCalendarsInZip(zip({ "team@group.calendar.google.com.ics": "BEGIN:VCALENDAR\r\nEND:VCALENDAR", "readme.txt": "x", "me.ics": "BEGIN:VCALENDAR" }));
    expect(text).toBe("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\nBEGIN:VCALENDAR");
    expect(await readCalendarsInZip(zip({ "a.txt": "x" }))).toBeNull();
  });
});
