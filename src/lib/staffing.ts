import { isChargeable, portionOn, type BookingSpan, type DayRules } from "@/lib/booking-days";
import { eachDay, type ISODate } from "@/lib/dates";

type TeamBooking = BookingSpan & { membershipId: string };

/** People off on a day; a half day counts as half a person. */
export function peopleOff(team: TeamBooking[], day: ISODate): number {
  let off = 0;
  for (const b of team) {
    const portion = portionOn(b, day);
    if (portion) off += portion === "FULL" ? 1 : 0.5;
  }
  return off;
}

/**
 * Working days in `span` where fewer than `minPresent` people would be in
 * once `candidate` is added to the existing bookings.
 */
export function understaffedDays(opts: {
  candidate: TeamBooking;
  team: TeamBooking[];
  memberCount: number;
  minPresent: number | null;
  rules: DayRules;
}): { day: ISODate; present: number }[] {
  const { candidate, team, memberCount, minPresent, rules } = opts;
  if (!minPresent || candidate.end < candidate.start) return [];
  const all = [...team, candidate];
  const short: { day: ISODate; present: number }[] = [];
  for (const day of eachDay(candidate.start, candidate.end)) {
    if (!isChargeable(day, rules) || !portionOn(candidate, day)) continue;
    const present = memberCount - peopleOff(all, day);
    if (present < minPresent) short.push({ day, present });
  }
  return short;
}
