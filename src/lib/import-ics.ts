import { addDays, type ISODate } from "@/lib/dates";
import { splitAddress, timeOffType, type TimeOffRow } from "@/lib/import";

/**
 * Time off from a calendar file (.ics), as Outlook and Google Calendar export it: a shared "Urlaub" calendar or someone's
 * own. Every all-day event is an absence; the person is the name in the title ("Urlaub Anna", "Anna Schmidt – OOO"),
 * else the one invited, else whoever made it. Timed meetings and repeating events are listed, not imported.
 */

export function looksLikeCalendar(text: string): boolean {
  return /^\s*BEGIN:VCALENDAR/i.test(text.replace(/^﻿/, ""));
}

type Prop = { name: string; params: Record<string, string>; value: string };

/** Lines of the file with folded continuation lines joined, split into name;params:value. */
function properties(text: string): Prop[] {
  const lines = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const out: Prop[] = [];
  for (const line of lines) {
    // The value starts at the first colon outside a quoted parameter.
    let quoted = false;
    let at = -1;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') quoted = !quoted;
      else if (line[i] === ":" && !quoted) {
        at = i;
        break;
      }
    }
    if (at < 0) continue;
    const [name, ...rest] = line.slice(0, at).split(";");
    const params: Record<string, string> = {};
    for (const p of rest) {
      const eq = p.indexOf("=");
      if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, "");
    }
    out.push({ name: name.toUpperCase(), params, value: line.slice(at + 1) });
  }
  return out;
}

const unescapeText = (v: string) => v.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();

/** "20261221" or "20261221T090000Z" → the date and whether a time was given. */
function dateOf(p: Prop | undefined): { date: ISODate; timed: boolean; time: string } | null {
  const m = p?.value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
  if (!m) return null;
  return { date: `${m[1]}-${m[2]}-${m[3]}`, timed: m[4] !== undefined && p!.params.VALUE !== "DATE", time: m[4] ? `${m[4]}${m[5]}` : "" };
}

/** Words in a title that say "away" rather than who; what's left is the person's name. */
const AWAY_WORDS =
  /(?<!\p{L})(?:urlaub|vacation|holidays?|ferien|ooo|out of (?:the )?office|abwesend|abwesenheit|frei|day off|time off|pto|leave|annual leave|resturlaub|halber tag|half day|vormittags?|nachmittags?|morning|afternoon|sonderurlaub|fortbildung|training|elternzeit|überstunden(?:abbau)?|zeitausgleich|krank|sick)(?!\p{L})/giu;

/** "Urlaub Anna Schmidt", "Anna – OOO", "Urlaub: Schmidt, Anna" → the name; "" when the title only says "Urlaub". */
export function nameFromTitle(title: string): string {
  return title
    .replace(AWAY_WORDS, " ")
    .replace(/[()[\]:|/–—-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,]+|[\s,]+$/g, "")
    .trim();
}

/** The word in a title that says which kind of absence it is ("Fortbildung Anna" → Other), "" when none does. */
function typeWordOf(title: string, categories: string): string {
  const words = `${categories} ${title}`.toLowerCase().match(/[\p{L}]+/gu) ?? [];
  return words.find((w) => timeOffType(w) !== "VACATION" && timeOffType(w) !== null) ?? "";
}

export function parseCalendar(text: string, opts: { from: ISODate }): TimeOffRow[] {
  const rows: TimeOffRow[] = [];
  let event: Prop[] | null = null;
  let index = 0;
  for (const p of properties(text)) {
    if (p.name === "BEGIN" && p.value.toUpperCase() === "VEVENT") event = [];
    else if (p.name === "END" && p.value.toUpperCase() === "VEVENT" && event) {
      index++;
      const row = eventRow(event, index, opts);
      if (row) rows.push(row);
      event = null;
    } else if (event) event.push(p);
  }
  return rows;
}

function eventRow(props: Prop[], line: number, opts: { from: ISODate }): TimeOffRow | null {
  const get = (name: string) => props.find((p) => p.name === name);
  if (get("STATUS")?.value.toUpperCase() === "CANCELLED") return null;
  // Free events (a reminder, a birthday) aren't absences; Outlook marks real ones busy or out of office.
  const busy = get("X-MICROSOFT-CDO-BUSYSTATUS")?.value.toUpperCase();
  if (busy === "FREE") return null;
  const start = dateOf(get("DTSTART"));
  if (!start) return null;
  const endProp = dateOf(get("DTEND"));
  const title = unescapeText(get("SUMMARY")?.value ?? "");
  const allDay = !start.timed || get("X-MICROSOFT-CDO-ALLDAYEVENT")?.value.toUpperCase() === "TRUE";
  // An all-day event ends the morning after its last day.
  let end = endProp ? (allDay && endProp.date > start.date ? addDays(endProp.date, -1) : endProp.date) : start.date;
  // Some tools write whole days as midnight to midnight.
  if (!allDay && start.time === "0000" && endProp?.time === "0000" && endProp.date > start.date) end = addDays(endProp.date, -1);
  if (end < opts.from) return null;

  const attendees = props.filter((p) => p.name === "ATTENDEE");
  const organizer = get("ORGANIZER");
  const address = (p: Prop) => ({ email: splitAddress(p.value).email, name: (p.params.CN ?? "").trim() });
  const titleName = nameFromTitle(title);
  // A title naming someone wins: in a shared calendar the organizer is often whoever typed it in.
  const who = titleName ? { email: "", name: titleName } : attendees.length === 1 ? address(attendees[0]) : organizer ? address(organizer) : { email: "", name: "" };

  const row: TimeOffRow = { line, email: who.email, name: who.name, start: start.date, end, startPart: "FULL", endPart: "FULL", type: "VACATION" };
  const fail = (code: NonNullable<TimeOffRow["error"]>["code"], value?: string) => ({ ...row, error: { code, value } });
  if (!who.email && !who.name) return fail("noEmail", title);
  if (get("RRULE")) return fail("recurring", title);
  if (!allDay && !(start.time === "0000" && endProp?.time === "0000")) return fail("timed", title);
  if (end < start.date) return fail("endBeforeStart");
  const type = timeOffType(typeWordOf(title, get("CATEGORIES")?.value ?? ""));
  if (type === "SICK") return fail("sick");
  if (type === "OTHER") row.type = "OTHER";
  if (row.start === row.end && /vormittag|morning/i.test(title)) row.endPart = "AM";
  else if (row.start === row.end && /nachmittag|afternoon/i.test(title)) row.startPart = "PM";
  return row;
}
