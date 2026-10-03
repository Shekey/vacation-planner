import type { BookingStatus, BookingType, Prisma, Role } from "@/generated/prisma/client";
import { carryOver, countDays, proratedAllowance, validateSpan, type BookingSpan, type DayRules } from "@/lib/booking-days";
import { formatRange, fromISO, toISO, type ISODate } from "@/lib/dates";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { postToTeams } from "@/lib/teams";

export const ACTIVE_STATUSES: BookingStatus[] = ["PENDING", "APPROVED"];

export type Settings = {
  approvalsEnabled: boolean;
  countWeekends: boolean;
  allowHalfDays: boolean;
  maxCarryOverDays: number | null;
  minPeoplePresent: number | null;
  teamsWebhookUrl: string | null;
  /** Default region for regional holidays, e.g. "DE-BE". */
  holidayRegion: string | null;
  /** Show colleagues' sick leave as "Other", without its note. */
  hideSickType: boolean;
};

/** Day-counting rules for one member: the workspace's weekend rule or their own work days, plus holidays. */
export function rulesFor(
  membership: { workDays?: readonly number[] | null },
  settings: { countWeekends: boolean },
  holidays: ReadonlySet<ISODate>,
): DayRules {
  return { countWeekends: settings.countWeekends, workDays: membership.workDays, holidays };
}

/**
 * Hides other people's sick leave from a viewer who isn't an admin, when the workspace asks for it:
 * the booking shows as "Other" and loses its note, since both can be health data.
 */
export function forViewer<T extends { type: BookingType; note: string | null; membershipId: string }>(
  bookings: T[],
  viewer: { membershipId: string; role: Role },
  settings: { hideSickType: boolean },
): T[] {
  if (!settings.hideSickType || viewer.role === "ADMIN") return bookings;
  return bookings.map((b) =>
    b.type === "SICK" && b.membershipId !== viewer.membershipId ? { ...b, type: "OTHER" as const, note: null } : b,
  );
}

/** The region whose holidays apply to a member: their own, else the workspace default, else nationwide only. */
export function regionOf(membership: { holidayRegion?: string | null }, settings: { holidayRegion: string | null }): string {
  return membership.holidayRegion ?? settings.holidayRegion ?? "";
}

/** Public holiday dates for people in `region` (nationwide ones plus that region's), for day counting. */
export async function loadHolidays(workspaceId: string, region = ""): Promise<Set<ISODate>> {
  const rows = await db.holiday.findMany({
    where: { workspaceId, region: { in: [...new Set(["", region])] } },
    select: { date: true },
  });
  return new Set(rows.map((h) => toISO(h.date)));
}

export class BookingError extends Error {}

/** Converts a Booking row into the date-only span used by the day math. */
export function spanOf(b: { startDate: Date; endDate: Date; startPart: string; endPart: string }): BookingSpan {
  return {
    start: toISO(b.startDate),
    end: toISO(b.endDate),
    startPart: b.startPart as BookingSpan["startPart"],
    endPart: b.endPart as BookingSpan["endPart"],
  };
}

function isOverlapError(e: unknown) {
  return String((e as Error)?.message ?? e).includes("Booking_no_overlap") ||
    JSON.stringify(e ?? "").includes("Booking_no_overlap");
}

type Actor = { userId: string; membershipId: string; role: Role };

type BookingInput = BookingSpan & { type: BookingType; note: string | null };

function prepare(input: BookingInput, settings: Settings, rules: DayRules) {
  const error = validateSpan(input, settings);
  if (error) throw new BookingError(error);
  const daysCount = countDays(input, rules);
  if (daysCount === 0) throw new BookingError("That range has no working days in it.");
  return {
    startDate: fromISO(input.start),
    endDate: fromISO(input.end),
    startPart: input.startPart,
    endPart: input.endPart,
    type: input.type,
    note: input.note,
    daysCount,
  };
}

/** Pending when approvals are on, unless an admin created it. */
function initialStatus(actor: Actor, settings: Settings): BookingStatus {
  return settings.approvalsEnabled && actor.role !== "ADMIN" ? "PENDING" : "APPROVED";
}

async function write<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isOverlapError(e)) throw new BookingError("This overlaps another booking for the same person.");
    throw e;
  }
}

export async function createBooking(opts: {
  workspace: { id: string; name: string; slug: string };
  settings: Settings;
  actor: Actor;
  membershipId: string;
  input: BookingInput;
  origin: string;
}) {
  const { workspace, settings, actor, membershipId, input } = opts;
  if (membershipId !== actor.membershipId && actor.role !== "ADMIN") {
    throw new BookingError("Only admins can book time off for someone else.");
  }
  const target = await db.membership.findFirst({
    where: { id: membershipId, workspaceId: workspace.id, removedAt: null },
    include: { user: true },
  });
  if (!target) throw new BookingError("That member is not in this workspace.");

  const status = initialStatus(actor, settings);
  const holidays = await loadHolidays(workspace.id, regionOf(target, settings));
  const booking = await write(() =>
    db.booking.create({
      data: {
        ...prepare(input, settings, rulesFor(target, settings, holidays)),
        status,
        workspaceId: workspace.id,
        membershipId,
        createdById: actor.userId,
        ...(status === "APPROVED" && settings.approvalsEnabled
          ? { decidedById: actor.userId, decidedAt: new Date() }
          : {}),
      },
    }),
  );

  if (status === "PENDING") await notifyAdminsOfRequest(workspace, target.user, booking, opts.origin);
  await announce(settings, target.user, booking, status === "PENDING" ? "requested time off" : "is off", `${opts.origin}/w/${workspace.slug}/calendar`);
  return booking;
}

/** Posts a one-line summary to the workspace's Teams channel, if one is set. */
async function announce(
  settings: Settings,
  person: { name: string | null; email: string },
  booking: { startDate: Date; endDate: Date; daysCount: Prisma.Decimal | number; type: BookingType },
  verb: string,
  calendarUrl: string,
) {
  // The channel is shared with colleagues, so private sick leave is posted as plain time off.
  const type = settings.hideSickType && booking.type === "SICK" ? "OTHER" : booking.type;
  const kind = { VACATION: "vacation", SICK: "sick leave", OTHER: "time off" }[type];
  await postToTeams(
    settings.teamsWebhookUrl,
    `${person.name ?? person.email} ${verb}: ${formatRange(toISO(booking.startDate), toISO(booking.endDate))} (${Number(
      booking.daysCount,
    )} days, ${kind})`,
    { title: "Open team calendar", url: `${calendarUrl}?month=${toISO(booking.startDate).slice(0, 7)}` },
  );
}

export async function updateBooking(opts: {
  workspace: { id: string; name: string; slug: string };
  settings: Settings;
  actor: Actor;
  bookingId: string;
  input: BookingInput;
  origin: string;
}) {
  const { workspace, settings, actor, input } = opts;
  const existing = await db.booking.findFirst({
    where: { id: opts.bookingId, workspaceId: workspace.id, status: { in: ACTIVE_STATUSES } },
    include: { membership: { include: { user: true } } },
  });
  if (!existing) throw new BookingError("Booking not found.");
  if (existing.membershipId !== actor.membershipId && actor.role !== "ADMIN") {
    throw new BookingError("You can only change your own bookings.");
  }

  // A member changing dates sends the booking back for approval.
  const status = initialStatus(actor, settings);
  const holidays = await loadHolidays(workspace.id, regionOf(existing.membership, settings));
  const booking = await write(() =>
    db.booking.update({
      where: { id: existing.id },
      data: {
        ...prepare(input, settings, rulesFor(existing.membership, settings, holidays)),
        status,
        ...(status === "PENDING" ? { decidedById: null, decidedAt: null, decisionNote: null } : {}),
      },
    }),
  );
  if (status === "PENDING") await notifyAdminsOfRequest(workspace, existing.membership.user, booking, opts.origin);
  await announce(
    settings,
    existing.membership.user,
    booking,
    status === "PENDING" ? "changed a request" : "changed time off",
    `${opts.origin}/w/${workspace.slug}/calendar`,
  );
  return booking;
}

export async function cancelBooking(opts: { workspaceId: string; actor: Actor; bookingId: string }) {
  const booking = await db.booking.findFirst({
    where: { id: opts.bookingId, workspaceId: opts.workspaceId, status: { in: ACTIVE_STATUSES } },
  });
  if (!booking) throw new BookingError("Booking not found.");
  if (booking.membershipId !== opts.actor.membershipId && opts.actor.role !== "ADMIN") {
    throw new BookingError("You can only cancel your own bookings.");
  }
  await db.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
}

export async function decideBooking(opts: {
  workspace: { id: string; name: string; slug: string };
  settings: Settings;
  actor: Actor;
  bookingId: string;
  approve: boolean;
  note: string | null;
  origin: string;
}) {
  if (opts.actor.role !== "ADMIN") throw new BookingError("Only admins can approve requests.");
  const booking = await db.booking.findFirst({
    where: { id: opts.bookingId, workspaceId: opts.workspace.id, status: "PENDING" },
    include: { membership: { include: { user: true } } },
  });
  if (!booking) throw new BookingError("This request was already handled.");

  await db.booking.update({
    where: { id: booking.id },
    data: {
      status: opts.approve ? "APPROVED" : "REJECTED",
      decidedById: opts.actor.userId,
      decidedAt: new Date(),
      decisionNote: opts.note,
    },
  });

  const span = spanOf(booking);
  await sendEmail({
    to: booking.membership.user.email,
    subject: `Your time off was ${opts.approve ? "approved" : "declined"}`,
    text: `Your request for ${span.start} to ${span.end} in ${opts.workspace.name} was ${
      opts.approve ? "approved" : "declined"
    }.${opts.note ? `\n\nNote: ${opts.note}` : ""}\n\n${opts.origin}/w/${opts.workspace.slug}/me`,
  });
  if (opts.approve) {
    await announce(opts.settings, booking.membership.user, booking, "is off", `${opts.origin}/w/${opts.workspace.slug}/calendar`);
  }
}

/** Approves everything still pending, used when approvals are switched off. */
export async function approveAllPending(workspaceId: string, actorId: string) {
  return db.booking.updateMany({
    where: { workspaceId, status: "PENDING" },
    data: { status: "APPROVED", decidedById: actorId, decidedAt: new Date() },
  });
}

async function notifyAdminsOfRequest(
  workspace: { id: string; name: string; slug: string },
  requester: { name: string | null; email: string },
  booking: { startDate: Date; endDate: Date; daysCount: Prisma.Decimal | number },
  origin: string,
) {
  const admins = await db.membership.findMany({
    where: { workspaceId: workspace.id, role: "ADMIN", removedAt: null },
    select: { user: { select: { email: true } } },
  });
  const who = requester.name ?? requester.email;
  await sendEmail({
    to: admins.map((a) => a.user.email),
    subject: `${who} requested time off`,
    text: `${who} requested ${Number(booking.daysCount)} day(s) off, ${toISO(booking.startDate)} to ${toISO(
      booking.endDate,
    )}, in ${workspace.name}.\n\nReview it: ${origin}/w/${workspace.slug}/approvals`,
  });
}

/** Bookings that touch [from, to], for calendars and "who's off". */
export function activeBookingsBetween(workspaceId: string, from: ISODate, to: ISODate) {
  return db.booking.findMany({
    where: {
      workspaceId,
      status: { in: ACTIVE_STATUSES },
      startDate: { lte: fromISO(to) },
      endDate: { gte: fromISO(from) },
      membership: { removedAt: null },
    },
    include: { membership: { include: { user: { select: { name: true, email: true } } } } },
    orderBy: { startDate: "asc" },
  });
}

export type AllowanceSummary = {
  year: number;
  /** Total for the year, including carried-over days; null when not tracked. */
  allowance: number | null;
  carriedOver: number;
  used: number;
  pending: number;
  remaining: number | null;
};

/** Vacation days (approved, pending) inside one calendar year; sick and other leave don't count. */
async function vacationDaysInYear(membershipId: string, rules: DayRules, year: number) {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const bookings = await db.booking.findMany({
    where: {
      membershipId,
      type: "VACATION",
      status: { in: ACTIVE_STATUSES },
      startDate: { lte: fromISO(to) },
      endDate: { gte: fromISO(from) },
    },
  });
  let used = 0;
  let pending = 0;
  for (const b of bookings) {
    const days = countDays(spanOf(b), rules, { from, to });
    if (b.status === "APPROVED") used += days;
    else pending += days;
  }
  return { used, pending };
}

export async function allowanceSummary(
  membership: {
    id: string;
    workspaceId: string;
    annualAllowanceDays: Prisma.Decimal | null;
    holidayRegion?: string | null;
    workDays?: readonly number[] | null;
    employmentStart?: Date | null;
    joinedAt: Date;
  },
  settings: Settings,
  year: number,
  holidays?: Set<ISODate>,
): Promise<AllowanceSummary> {
  const rules = rulesFor(
    membership,
    settings,
    holidays ?? (await loadHolidays(membership.workspaceId, regionOf(membership, settings))),
  );
  const { used, pending } = await vacationDaysInYear(membership.id, rules, year);
  if (membership.annualAllowanceDays === null) {
    return { year, allowance: null, carriedOver: 0, used, pending, remaining: null };
  }
  const yearly = Number(membership.annualAllowanceDays);
  const employmentStart = membership.employmentStart ? toISO(membership.employmentStart) : null;
  const base = proratedAllowance(yearly, employmentStart, year);
  let carriedOver = 0;
  // Nothing carries over from a year the person wasn't here yet (by start date, else by joining date).
  const since = employmentStart ?? toISO(membership.joinedAt);
  if (settings.maxCarryOverDays && Number(since.slice(0, 4)) < year) {
    const last = await vacationDaysInYear(membership.id, rules, year - 1);
    carriedOver = carryOver(proratedAllowance(yearly, employmentStart, year - 1), last.used + last.pending, settings.maxCarryOverDays);
  }
  const allowance = base + carriedOver;
  return { year, allowance, carriedOver, used, pending, remaining: allowance - used - pending };
}
