import { eachDay, isWeekend, type ISODate } from "@/lib/dates";

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
  /** Public holidays; they never count as days off. */
  holidays?: ReadonlySet<ISODate>;
};

/** Whether a booking on this day costs anything. */
export function isChargeable(day: ISODate, rules: DayRules): boolean {
  if (!rules.countWeekends && isWeekend(day)) return false;
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

/** Returns an error message, or null when the span is valid. */
export function validateSpan(span: BookingSpan, opts: { allowHalfDays: boolean }): string | null {
  if (span.end < span.start) return "The end date is before the start date.";
  if (span.startPart === "AM" || span.endPart === "PM") return "Invalid half-day selection.";
  if (!opts.allowHalfDays && (span.startPart !== "FULL" || span.endPart !== "FULL")) {
    return "Half days are turned off in this workspace.";
  }
  if (span.start === span.end && span.startPart === "PM" && span.endPart === "AM") {
    return "A single day can be a morning or an afternoon, not both.";
  }
  return null;
}

/** Labels a span for lists, e.g. "afternoon only" on single half days. */
export function halfDayLabel(span: BookingSpan): string | null {
  if (span.start === span.end) {
    if (span.endPart === "AM") return "morning";
    if (span.startPart === "PM") return "afternoon";
    return null;
  }
  const parts = [];
  if (span.startPart === "PM") parts.push("starts after lunch");
  if (span.endPart === "AM") parts.push("ends at lunch");
  return parts.length ? parts.join(", ") : null;
}

/** Unused days that roll into the next year, capped by the workspace setting. */
export function carryOver(baseAllowance: number, takenLastYear: number, maxCarryOver: number | null): number {
  if (!maxCarryOver || maxCarryOver <= 0) return 0;
  return Math.max(0, Math.min(maxCarryOver, baseAllowance - takenLastYear));
}
