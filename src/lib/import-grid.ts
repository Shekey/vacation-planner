import { addDays, isWeekend, type ISODate } from "@/lib/dates";
import { parseDateCell, type TimeOffRow } from "@/lib/import";

/**
 * The Excel year planner most small teams use: names down the left, one column per day, a mark where someone is off
 * ("U", "½", "FB"). Dates come from a header row of dates, or of day numbers under month names (Januar … Dezember).
 * Runs of marked days become one booking each; weekends in between don't break a run.
 */

const MONTHS: Record<string, number> = {
  jan: 1, januar: 1, january: 1, jänner: 1, jän: 1,
  feb: 2, februar: 2, february: 2,
  mär: 3, mar: 3, märz: 3, maerz: 3, march: 3, mrz: 3,
  apr: 4, april: 4,
  mai: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oct: 10, oktober: 10, october: 10,
  nov: 11, november: 11,
  dez: 12, dec: 12, dezember: 12, december: 12,
};

/** "Januar 2026", "Jan.", "MÄRZ" → month and the year when one is written next to it. */
function monthOf(cell: string): { month: number; year: number | null } | null {
  const m = cell.trim().toLowerCase().match(/^(\p{L}+)\.?\s*(?:'?(\d{2}|\d{4}))?$/u);
  if (!m || !MONTHS[m[1]]) return null;
  const year = m[2] ? (m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2])) : null;
  return { month: MONTHS[m[1]], year };
}

/** "01.12.", "1.12" (Excel shows dates without the year) or a full date. */
function dateIn(cell: string, year: number): ISODate | null {
  const full = parseDateCell(cell);
  if (typeof full === "string" && full.length === 10) return full;
  const m = cell.trim().match(/^(\d{1,2})\.(\d{1,2})\.?$/);
  if (!m) return null;
  const iso = `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` as ISODate;
  return parseDateCell(iso) === iso ? iso : null;
}

const dayNumber = (cell: string) => (/^\d{1,2}\.?$/.test(cell.trim()) ? parseInt(cell, 10) : null);

/** Column → date for a header row, or null when the row isn't a run of days. */
function datesOfRow(table: string[][], h: number, year: number): Map<number, ISODate> | null {
  const row = table[h];
  const direct = new Map<number, ISODate>();
  row.forEach((c, i) => {
    const d = dateIn(c, year);
    if (d) direct.set(i, d);
  });
  if (direct.size >= 7) return direct;

  // Day numbers 1 … 31; the month comes from month names above (or in the first cell), else counting from January.
  const numbers = row.map((c) => {
    const n = dayNumber(c);
    return n && n >= 1 && n <= 31 ? n : null;
  });
  const numbered = numbers.filter((n) => n !== null).length;
  if (numbered < 7) return null;
  const monthAt = new Map<number, number>();
  for (let r = Math.max(0, h - 3); r <= h; r++) {
    table[r].forEach((c, i) => {
      const m = monthOf(c);
      if (m) monthAt.set(i, m.month);
    });
  }
  const out = new Map<number, ISODate>();
  let month = 0;
  let prev = 0;
  for (let i = 0; i < row.length; i++) {
    if (monthAt.has(i)) {
      month = monthAt.get(i)!;
      prev = 0;
    }
    const n = numbers[i];
    if (n === null) continue;
    if (month === 0) month = 1;
    // Without month names, the days going back to 1 start the next month.
    else if (n < prev) month++;
    prev = n;
    if (month > 12) break;
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(n).padStart(2, "0")}` as ISODate;
    if (parseDateCell(iso) === iso) out.set(i, iso);
  }
  return out.size >= 7 ? out : null;
}

/** The year the planner is for: a year written in the top rows or a month heading, else the one given. */
function yearOf(table: string[][], upTo: number, fallback: number): number {
  for (let r = 0; r <= upTo; r++) {
    for (const c of table[r]) {
      const m = c.match(/(?:^|\D)(20\d{2})(?:\D|$)/);
      if (m && !/^\d{4}-\d{2}-\d{2}$/.test(c.trim())) return Number(m[1]);
    }
  }
  return fallback;
}

export type GridMark = "FULL" | "AM" | "PM" | "HALF" | "OTHER" | "SICK" | "NONE";

const MARKS: Record<string, GridMark> = {};
const mark = (kind: GridMark, ...words: string[]) => words.forEach((w) => (MARKS[w] = kind));
mark("FULL", "u", "ur", "url", "urlaub", "x", "1", "v", "vac", "vacation", "ul", "tu", "ju", "eu", "pto");
mark("HALF", "½", "0,5", "0.5", ",5", "1/2", "u/2", "u½", "½u", "hu", "h/u", "halb", "halber", "0,5u", "u0,5", "u 0,5");
mark("AM", "vm", "uvm", "u vm", "vorm", "vormittag", "am");
mark("PM", "nm", "unm", "u nm", "nachm", "nachmittag", "pm");
mark(
  "OTHER",
  "s", "su", "sonder", "sonderurlaub", "fb", "fortbildung", "weiterbildung", "schulung", "seminar", "bu", "bildungsurlaub", "ü", "üa", "üs", "ua",
  "überstunden", "fza", "za", "freizeitausgleich", "zeitausgleich", "ez", "elternzeit", "mu", "mutterschutz", "dr", "dienstreise", "o", "other", "sonstiges",
);
mark("SICK", "k", "kr", "krank", "kk", "kindkrank", "au", "sick", "ak");
mark("NONE", "", "-", "–", "f", "ft", "feiertag", "we", "wochenende", "0", "/", "·");

export function gridMark(cell: string): GridMark | null {
  return MARKS[cell.trim().toLowerCase().replace(/\s+/g, " ")] ?? null;
}

/** Rows that sum up or explain rather than name a person. */
const NOT_A_PERSON = /^(?:summe|gesamt|total|sum|feiertage?|holidays?|legende|legend|anzahl|urlaub gesamt|abwesend|kw|woche|week|mo|di|mi|do|fr|sa|so)\b/i;

export type Grid = { header: number; dates: Map<number, ISODate>; nameColumn: number };

/** Finds the row of days and the column of names, or null when this table isn't a planner grid. */
export function findGrid(table: string[][], fallbackYear: number): Grid | null {
  for (let h = 0; h < Math.min(table.length - 1, 12); h++) {
    const year = yearOf(table, h, fallbackYear);
    const dates = datesOfRow(table, h, year);
    if (!dates) continue;
    const firstDateColumn = Math.min(...dates.keys());
    const body = table.slice(h + 1);
    // The names are in the left-hand column with the most text in it.
    let nameColumn = -1;
    let best = 0;
    for (let c = 0; c < firstDateColumn; c++) {
      const texts = body.filter((r) => /\p{L}/u.test(r[c] ?? "") && gridMark(r[c]) === null).length;
      if (texts > best) [best, nameColumn] = [texts, c];
    }
    if (nameColumn >= 0) return { header: h, dates, nameColumn };
  }
  return null;
}

export function parseGrid(table: string[][], grid: Grid): TimeOffRow[] {
  const rows: TimeOffRow[] = [];
  const columns = [...grid.dates.keys()].sort((a, b) => a - b);
  for (let r = grid.header + 1; r < table.length; r++) {
    const cells = table[r];
    const who = (cells[grid.nameColumn] ?? "").trim();
    if (!who || NOT_A_PERSON.test(who) || !/\p{L}/u.test(who)) continue;
    const line = r + 1;
    const person = who.includes("@") ? { email: who.toLowerCase(), name: "" } : { email: "", name: who };
    const base = { line, ...person, startPart: "FULL" as const, endPart: "FULL" as const };

    const unknown = new Set<string>();
    // Runs of full days of one kind; a weekend with no mark doesn't end a run.
    let run: { start: ISODate; end: ISODate; kind: "FULL" | "OTHER" | "SICK" } | null = null;
    const close = () => {
      if (!run) return;
      if (run.kind === "SICK") rows.push({ ...base, start: run.start, end: run.end, type: "VACATION", error: { code: "sick" } });
      else rows.push({ ...base, start: run.start, end: run.end, type: run.kind === "OTHER" ? "OTHER" : "VACATION" });
      run = null;
    };
    for (const c of columns) {
      const day = grid.dates.get(c)!;
      const cell = (cells[c] ?? "").trim();
      const kind = gridMark(cell);
      if (kind === null) {
        unknown.add(cell);
        continue;
      }
      if (kind === "FULL" || kind === "OTHER" || kind === "SICK") {
        const gapIsWeekend = run !== null && everyDayBetween(run.end, day, isWeekend);
        if (run && run.kind === kind && (addDays(run.end, 1) === day || gapIsWeekend)) run.end = day;
        else {
          close();
          run = { start: day, end: day, kind };
        }
        continue;
      }
      if (kind === "NONE" && (cell === "" || cell === "-") && run && isWeekend(day)) continue;
      close();
      // A half day without saying which half counts as the morning.
      if (kind === "HALF" || kind === "AM") rows.push({ ...base, start: day, end: day, endPart: "AM", type: "VACATION" });
      else if (kind === "PM") rows.push({ ...base, start: day, end: day, startPart: "PM", type: "VACATION" });
    }
    close();
    for (const u of unknown) rows.push({ ...base, start: "", end: "", type: "VACATION", error: { code: "gridMark", value: u } });
  }
  return rows.sort((a, b) => a.line - b.line || a.start.localeCompare(b.start));
}

function everyDayBetween(after: ISODate, before: ISODate, test: (d: ISODate) => boolean): boolean {
  for (let d = addDays(after, 1); d < before; d = addDays(d, 1)) if (!test(d)) return false;
  return true;
}
