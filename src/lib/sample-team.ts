import { randomBytes } from "node:crypto";
import type { BookingStatus, BookingType, DayPart } from "@/generated/prisma/enums";
import { countDays } from "@/lib/booking-days";
import { addDays, fromISO, isWeekend, type ISODate } from "@/lib/dates";
import type { Locale } from "@/lib/i18n";
import type { TeamType } from "@/lib/team-types";

/**
 * "Fill with a sample team": made-up people with bookings over the next weeks, so a new admin sees a
 * filled calendar before inviting anyone. Their addresses use the reserved .invalid domain (RFC 2606),
 * so no email can ever reach anyone, and sendEmail and sign-in refuse them on top.
 */
export const SAMPLE_EMAIL_DOMAIN = "sample.invalid";

export function isSampleEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${SAMPLE_EMAIL_DOMAIN}`);
}

export function sampleEmail(): string {
  return `${randomBytes(9).toString("base64url").toLowerCase()}@${SAMPLE_EMAIL_DOMAIN}`;
}

type Person = { name: string; role?: Record<Locale, string> };

const GENERIC: Person[] = [
  { name: "Anna Becker" },
  { name: "Jonas Weber" },
  { name: "Leonie Wagner" },
  { name: "Murat Yılmaz" },
  { name: "Sophie Schulz" },
  { name: "Tim Hoffmann" },
];

/** Six people per kind of team, with a role that fits it. */
const PEOPLE: Partial<Record<TeamType, Person[]>> = {
  practice: [
    { name: "Dr. Lena Hoffmann", role: { en: "Doctor", de: "Ärztin" } },
    { name: "Sabine Krüger", role: { en: "Practice manager", de: "Praxismanagerin" } },
    { name: "Aylin Demir", role: { en: "Assistant", de: "Fachangestellte" } },
    { name: "Julia Neumann", role: { en: "Assistant", de: "Fachangestellte" } },
    { name: "Marie Schmitt", role: { en: "Reception", de: "Empfang" } },
    { name: "Ben Wolf", role: { en: "Trainee", de: "Azubi" } },
  ],
  care: [
    { name: "Katrin Lange", role: { en: "Care manager", de: "Pflegedienstleitung" } },
    { name: "Thomas Braun", role: { en: "Nurse", de: "Pflegefachkraft" } },
    { name: "Elena Popescu", role: { en: "Nurse", de: "Pflegefachkraft" } },
    { name: "Mehmet Kaya", role: { en: "Care assistant", de: "Pflegehilfskraft" } },
    { name: "Nina Richter", role: { en: "Care assistant", de: "Pflegehilfskraft" } },
    { name: "Paula Fischer", role: { en: "Office", de: "Verwaltung" } },
  ],
  childcare: [
    { name: "Claudia Meyer", role: { en: "Head of centre", de: "Kita-Leitung" } },
    { name: "Lisa Zimmermann", role: { en: "Educator", de: "Erzieherin" } },
    { name: "Daniel Koch", role: { en: "Educator", de: "Erzieher" } },
    { name: "Fatma Arslan", role: { en: "Educator", de: "Erzieherin" } },
    { name: "Hannah Schäfer", role: { en: "Assistant", de: "Kinderpflegerin" } },
    { name: "Lukas Bauer", role: { en: "Trainee", de: "Azubi" } },
  ],
  trades: [
    { name: "Stefan Schröder", role: { en: "Master craftsman", de: "Meister" } },
    { name: "Michael Klein", role: { en: "Journeyman", de: "Geselle" } },
    { name: "Dennis Wolff", role: { en: "Journeyman", de: "Geselle" } },
    { name: "Andrzej Nowak", role: { en: "Journeyman", de: "Geselle" } },
    { name: "Sandra Hahn", role: { en: "Office", de: "Büro" } },
    { name: "Kevin Vogel", role: { en: "Apprentice", de: "Azubi" } },
  ],
  hospitality: [
    { name: "Marco Rossi", role: { en: "Head chef", de: "Küchenchef" } },
    { name: "Svenja Jung", role: { en: "Service manager", de: "Serviceleitung" } },
    { name: "Ali Hassan", role: { en: "Cook", de: "Koch" } },
    { name: "Laura Keller", role: { en: "Service", de: "Service" } },
    { name: "Nico Berger", role: { en: "Service", de: "Service" } },
    { name: "Emma Frank", role: { en: "Trainee", de: "Azubi" } },
  ],
};

/** Display names for the sample people, e.g. "Aylin Demir (Fachangestellte)"; generic names when the team type is unknown. */
export function samplePeople(teamType: string | null | undefined, locale: Locale): string[] {
  const people = (teamType && PEOPLE[teamType as TeamType]) || GENERIC;
  return people.map((p) => (p.role ? `${p.name} (${p.role[locale]})` : p.name));
}

export type SampleBooking = {
  /** Index into the sample people. */
  person: number;
  start: ISODate;
  end: ISODate;
  startPart: Extract<DayPart, "FULL" | "PM">;
  endPart: Extract<DayPart, "FULL" | "AM">;
  type: Extract<BookingType, "VACATION" | "OTHER">;
  status: Extract<BookingStatus, "APPROVED" | "PENDING">;
};

/** The n-th weekday from `day` (n = 0 is `day` itself, moved to Monday on a weekend). */
function workday(day: ISODate, n: number): ISODate {
  let d = day;
  while (isWeekend(d)) d = addDays(d, 1);
  for (let i = 0; i < n; i++) {
    d = addDays(d, 1);
    while (isWeekend(d)) d = addDays(d, 1);
  }
  return d;
}

// [person, first weekday from today, weekdays long, half day, type, pending when approvals are on]
const PLAN: [number, number, number, "AM" | "PM" | null, "VACATION" | "OTHER", boolean][] = [
  [0, 0, 2, null, "VACATION", false], // off today, so "Out today" isn't empty
  [1, 3, 1, "AM", "VACATION", false],
  [2, 6, 5, null, "VACATION", false], // a full week
  [4, 8, 1, null, "OTHER", false],
  [3, 10, 3, null, "VACATION", true],
  [5, 14, 1, "PM", "VACATION", false],
  [0, 20, 5, null, "VACATION", false],
  [4, 24, 1, "AM", "VACATION", false],
  [1, 26, 4, null, "VACATION", false],
];

/**
 * Bookings for the sample people over the next six weeks, starting `today`: mostly approved vacation,
 * a few half days, one "other" absence and, when approvals are on, one pending request.
 * No person's bookings overlap.
 */
export function sampleBookings(today: ISODate, opts: { approvalsEnabled: boolean; allowHalfDays: boolean }): SampleBooking[] {
  return PLAN.map(([person, from, length, half, type, pending]) => {
    const start = workday(today, from);
    const end = workday(start, length - 1);
    const halfDay = opts.allowHalfDays ? half : null;
    return {
      person,
      start,
      end,
      startPart: halfDay === "PM" ? "PM" : "FULL",
      endPart: halfDay === "AM" ? "AM" : "FULL",
      type,
      status: pending && opts.approvalsEnabled ? "PENDING" : "APPROVED",
    };
  });
}

/** Booking rows ready to insert; spans that fall entirely on holidays are dropped. */
export function sampleBookingRows(
  bookings: SampleBooking[],
  membershipIds: string[],
  rules: { countWeekends: boolean; holidays: ReadonlySet<ISODate> },
) {
  return bookings.flatMap((b) => {
    const daysCount = countDays(b, rules);
    if (daysCount === 0) return [];
    return [
      {
        membershipId: membershipIds[b.person],
        startDate: fromISO(b.start),
        endDate: fromISO(b.end),
        startPart: b.startPart,
        endPart: b.endPart,
        type: b.type,
        status: b.status,
        daysCount,
      },
    ];
  });
}
