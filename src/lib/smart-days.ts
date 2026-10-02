import { addDays, eachDay, type ISODate } from "@/lib/dates";
import { isChargeable, type DayRules } from "@/lib/booking-days";

export type LongWeekendTip = {
  /** First and last day of the whole stretch off, weekends and holidays included. */
  start: ISODate;
  end: ISODate;
  /** The working days to book: the bridge between the free days. */
  bookFrom: ISODate;
  bookTo: ISODate;
  /** Working days the tip costs. */
  cost: number;
  /** Days off in a row. */
  length: number;
  holiday: ISODate;
};

/**
 * Bridge days around public holidays: one or two working days that join a holiday to a
 * weekend (or to another holiday), e.g. a Thursday holiday plus Friday off = 4 days in a row.
 * Days in `alreadyOff` count as free, so tips the person has already booked disappear.
 */
export function longWeekendTips(opts: {
  from: ISODate;
  to: ISODate;
  rules: DayRules;
  alreadyOff?: ReadonlySet<ISODate>;
  maxCost?: number;
}): LongWeekendTip[] {
  const { from, to, rules, alreadyOff, maxCost = 2 } = opts;
  const holidays = rules.holidays;
  if (!holidays?.size) return [];

  // Look a week either side so stretches that start before `from` or end after `to` are whole.
  const days = eachDay(addDays(from, -7), addDays(to, 7));
  const free = days.map((d) => !isChargeable(d, rules) || Boolean(alreadyOff?.has(d)));

  // Maximal runs of free days.
  const runs: { start: number; end: number }[] = [];
  for (let i = 0; i < days.length; i++) {
    if (!free[i]) continue;
    const start = i;
    while (i + 1 < days.length && free[i + 1]) i++;
    runs.push({ start, end: i });
  }

  const tips: LongWeekendTip[] = [];
  for (let r = 0; r + 1 < runs.length; r++) {
    const left = runs[r];
    const right = runs[r + 1];
    const cost = right.start - left.end - 1;
    if (cost < 1 || cost > maxCost) continue;
    const stretch = days.slice(left.start, right.end + 1);
    const holiday = stretch.find((d) => holidays.has(d));
    if (!holiday) continue;
    const bookFrom = days[left.end + 1];
    if (bookFrom < from || bookFrom > to) continue;
    tips.push({
      start: days[left.start],
      end: days[right.end],
      bookFrom,
      bookTo: days[right.start - 1],
      cost,
      length: stretch.length,
      holiday,
    });
  }
  return tips;
}

/**
 * Vacation days that will be lost at the end of the year: what's left beyond what may carry over.
 * Returns 0 when allowances aren't tracked.
 */
export function daysAtRisk(remaining: number | null, maxCarryOver: number | null): number {
  if (remaining === null || remaining <= 0) return 0;
  return Math.max(0, remaining - Math.max(0, maxCarryOver ?? 0));
}
