import type { ISODate } from "@/lib/dates";
import { parseTable, parseTimeOff, type TimeOffRow } from "@/lib/import";
import { findGrid, parseGrid } from "@/lib/import-grid";
import { looksLikeCalendar, parseCalendar } from "@/lib/import-ics";

export type TimeOffSource = "list" | "planner" | "calendar";

/** Time off from whatever the admin brought: a calendar file (.ics), an Excel year planner, or a list with one row per absence. */
export function readTimeOff(text: string, today: ISODate): { rows: TimeOffRow[]; source: TimeOffSource } {
  const year = Number(today.slice(0, 4));
  if (looksLikeCalendar(text)) return { rows: parseCalendar(text, { from: `${year - 1}-01-01` }), source: "calendar" };
  const table = parseTable(text);
  const grid = findGrid(table, year);
  if (grid) return { rows: parseGrid(table, grid), source: "planner" };
  return { rows: parseTimeOff(text), source: "list" };
}
