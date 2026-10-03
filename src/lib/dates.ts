import { intlLocale, messagesFor, type Locale } from "@/lib/i18n";

/** Calendar dates are handled as ISO strings ("YYYY-MM-DD") to avoid timezone drift. */
export type ISODate = string;

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== "string" || !ISO_RE.test(value)) return false;
  return toISO(fromISO(value)) === value;
}

/** Midnight UTC, which is how Postgres `date` columns come back from Prisma. */
export function fromISO(iso: ISODate): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function toISO(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = fromISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

export function isWeekend(iso: ISODate): boolean {
  const day = fromISO(iso).getUTCDay();
  return day === 0 || day === 6;
}

/** ISO weekday: 1 = Monday ... 7 = Sunday. */
export function isoWeekday(iso: ISODate): number {
  return fromISO(iso).getUTCDay() || 7;
}

export function eachDay(start: ISODate, end: ISODate): ISODate[] {
  const days: ISODate[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}

/** Today's date in an IANA timezone. */
export function todayIn(timeZone: string, now = new Date()): ISODate {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export type YearMonth = string; // "YYYY-MM"

export function monthBounds(month: YearMonth): { start: ISODate; end: ISODate } {
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const end = toISO(new Date(Date.UTC(y, m, 0)));
  return { start, end };
}

export function shiftMonth(month: YearMonth, delta: number): YearMonth {
  const [y, m] = month.split("-").map(Number);
  return toISO(new Date(Date.UTC(y, m - 1 + delta, 1))).slice(0, 7);
}

export function isYearMonth(value: unknown): value is YearMonth {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function formatDate(
  iso: ISODate,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" },
  locale: Locale = "en",
) {
  return new Intl.DateTimeFormat(intlLocale(locale), { ...opts, timeZone: "UTC" }).format(fromISO(iso));
}

export function formatRange(start: ISODate, end: ISODate, locale: Locale = "en"): string {
  const withYear = { day: "numeric", month: "short", year: "numeric" } as const;
  if (start === end) return formatDate(start, withYear, locale);
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${formatDate(start, sameYear ? undefined : withYear, locale)} – ${formatDate(end, withYear, locale)}`;
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((fromISO(to).getTime() - fromISO(from).getTime()) / 86_400_000);
}

/** "today", "tomorrow", "in 5 days" (or "heute", "morgen", "in 5 Tagen"). */
export function relativeDay(today: ISODate, day: ISODate, locale: Locale = "en"): string {
  const t = messagesFor(locale).common;
  const n = daysBetween(today, day);
  if (n <= 0) return t.today;
  if (n === 1) return t.tomorrow;
  return t.inDays(n);
}

/** "morning", "afternoon" or "evening" for the clock in that time zone. */
export function partOfDay(timeZone: string, now = new Date()): "morning" | "afternoon" | "evening" {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(now));
  return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}
