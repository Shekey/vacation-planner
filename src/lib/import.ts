import { normalizeWorkDays, portionOn, type BookingSpan } from "@/lib/booking-days";
import { eachDay, type ISODate } from "@/lib/dates";

/**
 * Importing a team from Excel: people (who they are, allowance, work days, start date) and their time off.
 * Admins paste cells from Excel (tab-separated) or open a CSV file (comma or semicolon, as Excel exports it).
 * Everything here is pure text handling; nothing touches the database, so it is easy to test.
 */

// ---------- reading the table ----------

/** Splits pasted or uploaded text into rows of cells. Detects tab, semicolon or comma, honours "quotes", skips empty rows. */
export function parseTable(input: string): string[][] {
  const text = input.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  // A title row ("Urlaubsplaner 2026") can come first, so look at the first few lines, not just one.
  const firstLines = text.split("\n").filter((l) => l.trim() !== "").slice(0, 5).join("\n");
  const count = (ch: string) => firstLines.split(ch).length - 1;
  const delimiter = count("\t") > 0 ? "\t" : count(";") > 0 ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell.trim());
  rows.push(row);
  return rows.filter((r) => r.some((c) => c !== ""));
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** Column names people use in Excel, English and German, lower-case without spaces or punctuation. */
const HEADERS = {
  // Also the names in exports from Microsoft 365 (User principal name), Google Workspace (Email Address [Required]) and HR tools.
  email: ["email", "emailadresse", "mail", "mailadresse", "emailaddress", "userprincipalname", "emailaddressrequired", "workemail", "primaryemail", "geschaftlicheemail", "geschäftlicheemail", "dienstlicheemail", "arbeitsemail"].map(norm),
  name: ["name", "fullname", "vollstandigername", "vollername", "mitarbeiter", "mitarbeitende", "mitarbeiterin", "mitarbeitername", "employee", "employeename", "person", "displayname", "anzeigename", "username", "member", "teammember", "staff"].map(norm),
  firstName: ["firstname", "vorname", "given name", "firstnamerequired", "first"].map(norm),
  lastName: ["lastname", "nachname", "familienname", "surname", "lastnamerequired", "familyname", "last"].map(norm),
  allowance: ["allowance", "yearlyallowance", "vacationdays", "days", "urlaubstage", "urlaubsanspruch", "anspruch", "tage", "jahresurlaub", "urlaub", "entitlement", "annualentitlement", "leaveallowance", "jahresanspruch", "urlaubsanspruchtage"].map(norm),
  carriedOver: ["carriedover", "carryover", "leftover", "leftoverdays", "daysleftlastyear", "resturlaub", "restvorjahr", "resturlaubvorjahr", "ubertrag", "übertrag", "urlaubsubertrag"].map(norm),
  workDays: ["workdays", "workingdays", "arbeitstage", "arbeitstag", "wochentage"].map(norm),
  employmentStart: ["employmentstart", "startdate", "start", "eintritt", "eintrittsdatum", "beschaftigtseit", "beschäftigtseit", "firstday", "joined", "hiredate", "dateofhire", "employmentstartdate", "joiningdate"].map(norm),
  region: ["region", "state", "bundesland", "land"].map(norm),
  role: ["role", "rolle"].map(norm),
  from: ["from", "start", "startdate", "von", "beginn", "firstday", "ersterurlaubstag", "erstertag", "startdatum", "vondatum", "datumvon", "abwesenheitvon", "leavestart", "firstdayofleave", "beginndatum"].map(norm),
  to: ["to", "end", "enddate", "bis", "ende", "lastday", "letzterurlaubstag", "letztertag", "enddatum", "bisdatum", "datumbis", "abwesenheitbis", "leaveend", "lastdayofleave"].map(norm),
  type: ["type", "art", "typ", "leavetype", "abwesenheit", "grund", "absencetype", "abwesenheitsart", "abwesenheitstyp", "timeofftype", "urlaubsart", "kategorie", "category", "policy"].map(norm),
  half: ["half", "halfday", "halbtag", "tagesteil", "part", "dayhalf"].map(norm),
  // Personio and others mark half days on a range: the first day starts after lunch, the last ends at lunch.
  halfStart: ["halfdaystart", "halfdayonstart", "startshalfday", "halbertaganfang", "halbtagbeginn", "halbtagstart", "ersterTaghalb"].map(norm),
  halfEnd: ["halfdayend", "halfdayonend", "endshalfday", "halbertagende", "halbtagende", "letzterTaghalb"].map(norm),
  // Exports from other tools list declined and cancelled requests too.
  status: ["status", "requeststatus", "approvalstatus", "genehmigungsstatus", "antragsstatus", "state"].map(norm),
} as const;

type Field = keyof typeof HEADERS;

/** Which column holds which field, or null when the first row isn't a header row. */
export function mapHeader(row: string[], fields: readonly Field[]): Partial<Record<Field, number>> | null {
  const map: Partial<Record<Field, number>> = {};
  row.forEach((cell, i) => {
    const key = norm(cell);
    for (const field of fields) {
      if (map[field] === undefined && (HEADERS[field] as readonly string[]).includes(key)) map[field] = i;
    }
  });
  // A real header names at least one column and holds no email address itself.
  return Object.keys(map).length > 0 && !row.some((c) => EMAIL.test(c)) ? map : null;
}

// ---------- cells ----------

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: string): boolean {
  return EMAIL.test(value);
}

/** "Ben Meyer <ben@x.de>" (Outlook) → name and address; a plain address comes back as is. */
export function splitAddress(cell: string): { name: string; email: string } {
  const m = cell.trim().match(/^"?([^"<]*?)"?\s*<([^>]+)>$/);
  return m ? { name: m[1].trim(), email: m[2].trim().toLowerCase() } : { name: "", email: cell.trim().toLowerCase().replace(/^mailto:/, "") };
}

/** "28", "28,5", "28.5", "28 Tage" → a number in half steps from 0 to 365; null when empty; "bad" otherwise. */
export function parseAllowance(cell: string): number | null | "bad" {
  const text = cell.trim().toLowerCase();
  if (text === "") return null;
  const m = text.match(/^(\d{1,3}(?:[.,]\d)?)\s*(?:days?|tage?|d|t)?$/);
  if (!m) return "bad";
  const n = Number(m[1].replace(",", "."));
  return n >= 0 && n <= 365 && (n * 2) % 1 === 0 ? n : "bad";
}

const WEEKDAYS: Record<string, number> = {
  mo: 1, mon: 1, monday: 1, montag: 1, "1": 1,
  di: 2, tu: 2, tue: 2, tues: 2, tuesday: 2, dienstag: 2, "2": 2,
  mi: 3, we: 3, wed: 3, wednesday: 3, mittwoch: 3, "3": 3,
  do: 4, th: 4, thu: 4, thur: 4, thurs: 4, thursday: 4, donnerstag: 4, "4": 4,
  fr: 5, fri: 5, friday: 5, freitag: 5, "5": 5,
  sa: 6, sat: 6, saturday: 6, samstag: 6, "6": 6,
  so: 7, su: 7, sun: 7, sunday: 7, sonntag: 7, "7": 7,
};

/**
 * "Mo-Fr", "Mo, Mi, Fr", "Mon-Thu", "1-5" → ISO weekdays; [] for the workspace default (empty or "full time");
 * "bad" when it can't be read. The result is normalized like the Members page does it.
 */
export function parseWorkDays(cell: string, countWeekends: boolean): number[] | "bad" {
  const text = cell
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s*(?:–|—|-|bis|to)\s*/g, "-");
  if (text === "" || ["vollzeit", "fulltime", "full-time", "full time", "alle", "all"].includes(text)) return [];
  const days: number[] = [];
  for (const token of text.split(/[\s,;/+&]+/).filter(Boolean)) {
    const range = token.split("-");
    if (range.length === 1) {
      const d = WEEKDAYS[range[0]];
      if (!d) return "bad";
      days.push(d);
    } else if (range.length === 2) {
      const a = WEEKDAYS[range[0]];
      const b = WEEKDAYS[range[1]];
      if (!a || !b || a > b) return "bad";
      for (let d = a; d <= b; d++) days.push(d);
    } else return "bad";
  }
  return days.length ? normalizeWorkDays(days, countWeekends) : "bad";
}

function validDate(y: number, m: number, d: number): ISODate | null {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * "2026-11-02", "02.11.2026", "2.11.26", "13/11/2026" → ISO date; "" → null; "bad" when unreadable;
 * "ambiguous" for "03/04/2026", where day and month can't be told apart.
 */
export function parseDateCell(cell: string): ISODate | null | "bad" | "ambiguous" {
  const text = cell.trim().replace(/[ T]\d{1,2}:\d{2}(?::\d{2})?$/, "");
  if (text === "") return null;
  let m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return validDate(+m[1], +m[2], +m[3]) ?? "bad";
  m = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/);
  if (m) return validDate(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]) ?? "bad";
  m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [a, b] = [+m[1], +m[2]];
    if (a > 12 && b <= 12) return validDate(+m[3], b, a) ?? "bad";
    if (b > 12 && a <= 12) return validDate(+m[3], a, b) ?? "bad";
    return a === b ? (validDate(+m[3], a, b) ?? "bad") : "ambiguous";
  }
  return "bad";
}

export function parseRole(cell: string): "ADMIN" | "MEMBER" | "bad" {
  const t = norm(cell);
  if (t === "" || ["member", "mitglied", "mitarbeiter", "user", "benutzer"].includes(t)) return "MEMBER";
  return ["admin", "administrator", "administratorin"].includes(t) ? "ADMIN" : "bad";
}

export type ImportErrorCode =
  | "noEmail"
  | "badEmail"
  | "sampleEmail"
  | "duplicate"
  | "allowance"
  | "carriedOver"
  | "workDays"
  | "date"
  | "dateAmbiguous"
  | "region"
  | "role"
  | "noStart"
  | "endBeforeStart"
  | "type"
  | "sick"
  | "half"
  | "halfRange"
  | "halfDaysOff"
  | "noWorkingDays"
  | "outOfRange"
  | "overlap"
  | "notMember"
  | "removedMember"
  | "ambiguousName"
  | "notApproved"
  | "pending"
  | "gridMark"
  | "recurring"
  | "timed";

export type ImportError = { code: ImportErrorCode; value?: string };

// ---------- people ----------

export type PersonRow = {
  /** 1-based line in the pasted text, for messages. */
  line: number;
  /** "" for someone without an email address, who is then added by name. */
  email: string;
  name: string | null;
  allowance: number | null;
  /** Days left over from last year (Resturlaub), when the sheet has that column. */
  carriedOver: number | null;
  /** [] means the workspace default; null means not given. */
  workDays: number[] | null;
  employmentStart: ISODate | null;
  region: string | null;
  /** The sheet named a state but the workspace has no holiday country yet, so it was left out. */
  regionIgnored?: boolean;
  role: "ADMIN" | "MEMBER";
  error?: ImportError;
};

export type RegionNames = { code: string; names: string[] }[];

export function matchRegion(cell: string, regions: RegionNames): string | null {
  const key = norm(cell);
  if (!key) return null;
  return regions.find((r) => norm(r.code) === key || r.names.some((n) => norm(n) === key))?.code ?? null;
}

/**
 * Reads a pasted team list. With a header row (Name, E-Mail, Urlaubstage, Resturlaub, Arbeitstage, Eintritt, Bundesland, Rolle, in
 * any order, English or German) columns are matched by name; without one, the email is the cell with an @, the name the
 * first other text and the allowance the first number.
 */
export function parsePeople(
  text: string,
  opts: { countWeekends: boolean; regions: RegionNames | null },
): PersonRow[] {
  const table = parseTable(text);
  if (table.length === 0) return [];
  const fields = ["email", "name", "firstName", "lastName", "allowance", "carriedOver", "workDays", "employmentStart", "region", "role"] as const;
  const header = mapHeader(table[0], fields);
  const body = header ? table.slice(1) : table;
  const firstLine = header ? 2 : 1;
  const seen = new Set<string>();

  return body.map((cells, i): PersonRow => {
    const get = (f: Field) => (header && header[f] !== undefined ? (cells[header[f]!] ?? "").trim() : "");
    let email: string;
    let name: string;
    let allowanceCell: string;
    if (header) {
      const address = splitAddress(get("email"));
      email = address.email;
      name = get("name") || address.name || [get("firstName"), get("lastName")].filter(Boolean).join(" ");
      allowanceCell = get("allowance");
    } else {
      const address = splitAddress(cells.find((c) => c.includes("@")) ?? "");
      email = address.email;
      name = cells.find((c) => c && !c.includes("@") && /\p{L}/u.test(c) && parseAllowance(c) === "bad") ?? address.name;
      allowanceCell = cells.find((c) => c && !c.includes("@") && typeof parseAllowance(c) === "number") ?? "";
    }
    const row: PersonRow = {
      line: firstLine + i,
      email,
      name: name || null,
      allowance: null,
      carriedOver: null,
      workDays: null,
      employmentStart: null,
      region: null,
      role: "MEMBER",
    };
    const fail = (code: ImportErrorCode, value?: string) => {
      row.error = { code, value };
      return row;
    };

    // A row with a name but no email adds someone without email; admins book their time off.
    if (!email && !row.name) return fail("noEmail");
    if (email && !isEmail(email)) return fail("badEmail", email);
    if (email.endsWith(".invalid")) return fail("sampleEmail", email);
    const key = email || `name:${norm(row.name ?? "")}`;
    if (seen.has(key)) return fail("duplicate", email || (row.name ?? ""));
    seen.add(key);

    const allowance = parseAllowance(allowanceCell);
    if (allowance === "bad") return fail("allowance", allowanceCell);
    row.allowance = allowance;

    if (header) {
      const carriedOver = parseAllowance(get("carriedOver"));
      if (carriedOver === "bad") return fail("carriedOver", get("carriedOver"));
      row.carriedOver = carriedOver;

      const workDays = parseWorkDays(get("workDays"), opts.countWeekends);
      if (workDays === "bad") return fail("workDays", get("workDays"));
      row.workDays = get("workDays") === "" ? null : workDays;

      const start = parseDateCell(get("employmentStart"));
      if (start === "bad") return fail("date", get("employmentStart"));
      if (start === "ambiguous") return fail("dateAmbiguous", get("employmentStart"));
      row.employmentStart = start;

      if (get("region") && opts.regions === null) row.regionIgnored = true;
      else if (get("region")) {
        const region = matchRegion(get("region"), opts.regions ?? []);
        if (!region) return fail("region", get("region"));
        row.region = region;
      }
      const role = parseRole(get("role"));
      if (role === "bad") return fail("role", get("role"));
      row.role = role;
    }
    return row;
  });
}

// ---------- time off ----------

export type TimeOffRow = {
  line: number;
  /** "" when the row names someone who was added without email. */
  email: string;
  name: string;
  start: ISODate;
  end: ISODate;
  startPart: "FULL" | "PM";
  endPart: "FULL" | "AM";
  type: "VACATION" | "OTHER";
  error?: ImportError;
};

// Also the type names of Personio, absence.io, Timetastic and Vacation Tracker.
const VACATION_WORDS = ["vacation", "urlaub", "holiday", "holidays", "ferien", "annualleave", "erholungsurlaub", "paidtimeoff", "pto", "jahresurlaub", "bezahlterurlaub", "tarifurlaub", "urlaubstag", "leave", "timeoff", "vacationday", ""].map(norm);
const OTHER_WORDS = [
  "other", "sonstiges", "sonstige", "sonderurlaub", "unbezahlt", "unbezahlterurlaub", "unpaid", "unpaidleave", "training", "fortbildung", "weiterbildung", "schulung",
  "seminar", "bildungsurlaub", "uberstunden", "überstunden", "ueberstunden", "uberstundenabbau", "überstundenabbau", "freizeitausgleich", "zeitausgleich", "toil",
  "special", "specialleave", "elternzeit", "parentalleave", "mutterschutz", "maternityleave", "paternityleave", "compassionateleave", "bereavement", "umzug",
  "hochzeit", "dienstreise", "businesstrip", "conference", "konferenz",
].map(norm);
const SICK_WORDS = ["sick", "sickness", "sickleave", "illness", "krank", "krankheit", "krankmeldung", "krankheitstag", "kindkrank", "krankeskind", "sickchild", "arbeitsunfahigkeit", "arbeitsunfähigkeit", "au"].map(norm);
const APPROVED = ["", "approved", "accepted", "confirmed", "genehmigt", "bestatigt", "bestätigt", "angenommen", "freigegeben", "ok", "taken", "genommen"].map(norm);
const PENDING = ["pending", "requested", "open", "waiting", "awaitingapproval", "beantragt", "offen", "ausstehend", "wartend", "angefragt", "inprogress"].map(norm);
const YES = ["yes", "ja", "true", "wahr", "x", "1", "y", "j"].map(norm);
const NO = ["", "no", "nein", "false", "falsch", "0", "n"].map(norm);
const MORNING = ["am", "morning", "vormittag", "vormittags", "morgens", "morgen"].map(norm);
const AFTERNOON = ["pm", "afternoon", "nachmittag", "nachmittags"].map(norm);
const FULL = ["full", "fullday", "ganztag", "ganztags", "ganz", ""].map(norm);

/** What kind of absence a word in a sheet names, e.g. "Fortbildung" → Other; null when it isn't one we know. */
export function timeOffType(word: string): "VACATION" | "OTHER" | "SICK" | null {
  const w = norm(word);
  if (SICK_WORDS.includes(w)) return "SICK";
  if (OTHER_WORDS.includes(w)) return "OTHER";
  return VACATION_WORDS.includes(w) ? "VACATION" : null;
}

/** Date ranges per person, e.g. "anna@x.de, 02.11.2026, 06.11.2026, Urlaub" or with header columns Email, Von, Bis, Art, Halbtag. */
export function parseTimeOff(text: string): TimeOffRow[] {
  const table = parseTable(text);
  if (table.length === 0) return [];
  const fields = ["email", "name", "firstName", "lastName", "from", "to", "type", "half", "halfStart", "halfEnd", "status"] as const;
  const header = mapHeader(table[0], fields);
  const body = header ? table.slice(1) : table;
  const firstLine = header ? 2 : 1;

  return body.map((cells, i): TimeOffRow => {
    let emailCell: string;
    let nameCell = "";
    let fromCell: string;
    let toCell: string;
    let typeCell = "";
    let halfCell = "";
    let halfStartCell = "";
    let halfEndCell = "";
    let statusCell = "";
    if (header) {
      const get = (f: Field) => (header[f] !== undefined ? (cells[header[f]!] ?? "").trim() : "");
      [emailCell, fromCell, toCell, typeCell, halfCell] = [get("email"), get("from"), get("to"), get("type"), get("half")];
      [halfStartCell, halfEndCell, statusCell] = [get("halfStart"), get("halfEnd"), get("status")];
      nameCell = get("name") || [get("firstName"), get("lastName")].filter(Boolean).join(" ");
    } else {
      emailCell = cells.find((c) => c.includes("@")) ?? "";
      const dates = cells.filter((c) => c && !c.includes("@") && parseDateCell(c) !== null && parseDateCell(c) !== "bad");
      [fromCell, toCell] = [dates[0] ?? "", dates[1] ?? ""];
      const words = cells.filter((c) => c && !c.includes("@") && !dates.includes(c));
      typeCell = words.find((c) => !AFTERNOON.includes(norm(c)) && !MORNING.includes(norm(c))) ?? "";
      halfCell = words.find((c) => AFTERNOON.includes(norm(c)) || MORNING.includes(norm(c))) ?? "";
    }
    const email = splitAddress(emailCell).email;
    const row: TimeOffRow = { line: firstLine + i, email, name: nameCell, start: "", end: "", startPart: "FULL", endPart: "FULL", type: "VACATION" };
    const fail = (code: ImportErrorCode, value?: string) => {
      row.error = { code, value };
      return row;
    };
    if (!email && !nameCell) return fail("noEmail");
    if (email && !isEmail(email)) return fail("badEmail", email);

    const status = norm(statusCell);
    if (PENDING.includes(status)) return fail("pending", statusCell);
    if (!APPROVED.includes(status)) return fail("notApproved", statusCell);

    const start = parseDateCell(fromCell);
    if (start === null) return fail("noStart");
    if (start === "bad") return fail("date", fromCell);
    if (start === "ambiguous") return fail("dateAmbiguous", fromCell);
    const end = parseDateCell(toCell);
    if (end === "bad") return fail("date", toCell);
    if (end === "ambiguous") return fail("dateAmbiguous", toCell);
    row.start = start;
    row.end = end ?? start;
    if (row.end < row.start) return fail("endBeforeStart");

    const type = norm(typeCell);
    if (SICK_WORDS.includes(type)) return fail("sick", typeCell);
    if (OTHER_WORDS.includes(type)) row.type = "OTHER";
    else if (!VACATION_WORDS.includes(type)) return fail("type", typeCell);

    const half = norm(halfCell);
    if (MORNING.includes(half) || AFTERNOON.includes(half)) {
      if (row.start !== row.end) return fail("halfRange", halfCell);
      if (MORNING.includes(half)) row.endPart = "AM";
      else row.startPart = "PM";
    } else if (!FULL.includes(half)) return fail("half", halfCell);

    for (const [cell, edge] of [[halfStartCell, "start"], [halfEndCell, "end"]] as const) {
      const v = norm(cell);
      if (YES.includes(v)) {
        if (edge === "start") row.startPart = "PM";
        else row.endPart = "AM";
      } else if (!NO.includes(v)) return fail("half", cell);
    }
    // One half day marked on both ends of a single day means just that half.
    if (row.start === row.end && row.startPart === "PM" && row.endPart === "AM") row.endPart = "FULL";
    return row;
  });
}

/** Whether two bookings of one person share any part of a day (a morning and an afternoon don't clash). */
export function spansConflict(a: BookingSpan, b: BookingSpan): boolean {
  const from = a.start > b.start ? a.start : b.start;
  const to = a.end < b.end ? a.end : b.end;
  if (from > to) return false;
  return eachDay(from, to).some((day) => {
    const pa = portionOn(a, day);
    const pb = portionOn(b, day);
    return pa !== null && pb !== null && (pa === "FULL" || pb === "FULL" || pa === pb);
  });
}

// ---------- finding people by name ----------

export type KnownPerson = { id: string; name: string | null; email: string };

/** "Jürgen Müller", "juergen mueller" and "Müller, Jürgen" all give the same words: juergen, mueller. */
function nameWords(name: string): string[] {
  const folded = name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  const [last, first] = folded.split(",");
  const ordered = first !== undefined ? `${first} ${last}` : folded;
  return ordered.split(/[^\p{L}\p{N}.]+/u).filter(Boolean);
}

/**
 * Who a name in a sheet or calendar means: the full name in any order, else a first or last name (or "Lena W.") that
 * fits exactly one person, else the part of an email address before the @. Null when nobody fits, "ambiguous" when
 * more than one does and the admin has to use the email.
 */
export function findPerson(cell: string, people: KnownPerson[]): string | "ambiguous" | null {
  const words = nameWords(cell);
  if (words.length === 0) return null;
  const key = (w: string[]) => [...w].map((x) => x.replace(/\.$/, "")).sort().join(" ");
  const tiers: ((p: KnownPerson) => boolean)[] = [
    (p) => key(nameWords(p.name ?? "")) === key(words),
    (p) => {
      const theirs = nameWords(p.name ?? "");
      // Every word given is one of their words, or the initial of one ("Lena W.").
      return words.every((w) =>
        w.endsWith(".") && w.length <= 3 ? theirs.some((t) => t.startsWith(w.slice(0, -1))) : theirs.includes(w),
      );
    },
    (p) => words.length === 1 && p.email.split("@")[0].toLowerCase() === words[0],
  ];
  for (const fits of tiers) {
    const found = people.filter(fits);
    if (found.length === 1) return found[0].id;
    if (found.length > 1) return "ambiguous";
  }
  return null;
}
