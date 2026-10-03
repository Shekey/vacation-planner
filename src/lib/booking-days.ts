import { eachDay, isoWeekday, isWeekend, type ISODate } from "@/lib/dates";
import { messagesFor, type Locale } from "@/lib/i18n";

export type DayPart = "FULL" | "AM" | "PM";

export type BookingSpan = {
  start: ISODate;
  end: ISODate;
  /** FULL, or PM when the first day starts after lunch. */
  startPart: DayPart;
  /** FULL, or AM when the last day ends at lunch. */
  endPart: DayPart;
};

export type DayRules = {
  countWeekends: boolean;
  /**
   * ISO weekdays (1 = Monday ... 7 = Sunday) the person works, for part-time schedules.
   * When set and not empty it replaces the weekend rule.
   */
  workDays?: readonly number[] | null;
  /** Public holidays; they never count as days off. */
  holidays?: ReadonlySet<ISODate>;
};

/** Whether a booking on this day costs anything. */
export function isChargeable(day: ISODate, rules: DayRules): boolean {
  if (rules.workDays?.length) {
    if (!rules.workDays.includes(isoWeekday(day))) return false;
  } else if (!rules.countWeekends && isWeekend(day)) return false;
  return !rules.holidays?.has(day);
}

/** Which part of `day` the booking covers, or null if none. */
export function portionOn(span: BookingSpan, day: ISODate): "FULL" | "AM" | "PM" | null {
  if (day < span.start || day > span.end) return null;
  const startsPm = day === span.start && span.startPart === "PM";
  const endsAm = day === span.end && span.endPart === "AM";
  if (startsPm && endsAm) return null; // invalid on a single day, see validateSpan
  if (startsPm) return "PM";
  if (endsAm) return "AM";
  return "FULL";
}

/**
 * Days charged for a booking: weekends (unless they count) and holidays are skipped,
 * half days count 0.5. `clip` limits counting to a window (e.g. one calendar year).
 */
export function countDays(span: BookingSpan, rules: DayRules, clip?: { from: ISODate; to: ISODate }): number {
  const from = clip && clip.from > span.start ? clip.from : span.start;
  const to = clip && clip.to < span.end ? clip.to : span.end;
  if (from > to) return 0;
  let total = 0;
  for (const day of eachDay(from, to)) {
    if (!isChargeable(day, rules)) continue;
    const portion = portionOn(span, day);
    if (portion) total += portion === "FULL" ? 1 : 0.5;
  }
  return total;
}

export type SpanProblem = "endBeforeStart" | "invalidHalfDay" | "halfDaysOff" | "morningAndAfternoon";

/** Returns what's wrong (a key into the `errors` messages), or null when the span is valid. */
export function validateSpan(span: BookingSpan, opts: { allowHalfDays: boolean }): SpanProblem | null {
  if (span.end < span.start) return "endBeforeStart";
  if (span.startPart === "AM" || span.endPart === "PM") return "invalidHalfDay";
  if (!opts.allowHalfDays && (span.startPart !== "FULL" || span.endPart !== "FULL")) {
    return "halfDaysOff";
  }
  if (span.start === span.end && span.startPart === "PM" && span.endPart === "AM") {
    return "morningAndAfternoon";
  }
  return null;
}

/** Labels a span for lists, e.g. "afternoon only" on single half days. */
export function halfDayLabel(span: BookingSpan, locale: Locale = "en"): string | null {
  const t = messagesFor(locale).common.halfDay;
  if (span.start === span.end) {
    if (span.endPart === "AM") return t.morning;
    if (span.startPart === "PM") return t.afternoon;
    return null;
  }
  const parts = [];
  if (span.startPart === "PM") parts.push(t.startsAfterLunch);
  if (span.endPart === "AM") parts.push(t.endsAtLunch);
  return parts.length ? parts.join(", ") : null;
}

/** Unused days that roll into the next year, capped by the workspace setting. */
export function carryOver(baseAllowance: number, takenLastYear: number, maxCarryOver: number | null): number {
  if (!maxCarryOver || maxCarryOver <= 0) return 0;
  return Math.max(0, Math.min(maxCarryOver, baseAllowance - takenLastYear));
}

/** A "MM-DD" day that exists every year (so not 29 February), e.g. "03-31". */
export function isMonthDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{2}-\d{2}$/.test(value)) return false;
  const [month, day] = value.split("-").map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(2027, month, 0)).getUTCDate();
}

/**
 * Carried-over days are used first: vacation taken up to the deadline spends them, and whatever is
 * still unused once the deadline has passed expires. `left` is what can still be taken before it.
 */
export function carriedOverStatus(carried: number, takenByDeadline: number, deadlinePassed: boolean) {
  const used = Math.min(carried, Math.max(0, takenByDeadline));
  const unused = carried - used;
  return { used, left: deadlinePassed ? 0 : unused, expired: deadlinePassed ? unused : 0 };
}

/**
 * The allowance for `year` when employment starts during it: 1/12 per full month employed,
 * rounded up to a half day (German practice under BUrlG section 5). Starting before the year
 * keeps the full allowance; starting after it gives none.
 */
export function proratedAllowance(base: number, employmentStart: ISODate | null, year: number): number {
  if (!employmentStart || employmentStart <= `${year}-01-01`) return base;
  const startYear = Number(employmentStart.slice(0, 4));
  if (startYear > year) return 0;
  const month = Number(employmentStart.slice(5, 7));
  const fullMonths = employmentStart.slice(8, 10) === "01" ? 13 - month : 12 - month;
  return Math.ceil(((base * fullMonths) / 12) * 2) / 2;
}

/** The work days a workspace assumes when a member has none of their own. */
export function defaultWorkDays(countWeekends: boolean): number[] {
  return countWeekends ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5];
}

/**
 * Normalizes weekday picks from a form: unique ISO weekdays 1 to 7, sorted.
 * Picking exactly the workspace default comes back empty, so later changes to the default apply.
 */
export function normalizeWorkDays(days: readonly number[], countWeekends: boolean): number[] {
  const set = [...new Set(days.filter((d) => Number.isInteger(d) && d >= 1 && d <= 7))].sort((a, b) => a - b);
  return set.join() === defaultWorkDays(countWeekends).join() ? [] : set;
}
