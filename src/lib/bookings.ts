import type { BookingStatus, BookingType, Prisma, Role } from "@/generated/prisma/client";
import { carryOver, countDays, validateSpan, type BookingSpan, type DayRules } from "@/lib/booking-days";
import { formatRange, fromISO, toISO, type ISODate } from "@/lib/dates";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { postToSlack } from "@/lib/slack";

export const ACTIVE_STATUSES: BookingStatus[] = ["PENDING", "APPROVED"];

export type Settings = {
  approvalsEnabled: boolean;
  countWeekends: boolean;
  allowHalfDays: boolean;
  maxCarryOverDays: number | null;
  minPeoplePresent: number | null;
  slackWebhookUrl: string | null;
};

/** Public holiday dates of a workspace, for day counting. */
export async function loadHolidays(workspaceId: string): Promise<Set<ISODate>> {
  const rows = await db.holiday.findMany({ where: { workspaceId }, select: { date: true } });
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

function prepare(input: BookingInput, settings: Settings, holidays: Set<ISODate>) {
  const error = validateSpan(input, settings);
  if (error) throw new BookingError(error);
  const daysCount = countDays(input, { countWeekends: settings.countWeekends, holidays });
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
  const holidays = await loadHolidays(workspace.id);
  const booking = await write(() =>
    db.booking.create({
      data: {
        ...prepare(input, settings, holidays),
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
  await announce(settings, target.user, booking, status === "PENDING" ? "requested time off" : "is off");
  return booking;
}

/** Posts a one-line summary to the workspace's Slack channel, if one is set. */
async function announce(
  settings: Settings,
  person: { name: string | null; email: string },
  booking: { startDate: Date; endDate: Date; daysCount: Prisma.Decimal | number; type: BookingType },
  verb: string,
) {
  const kind = { VACATION: "vacation", SICK: "sick leave", OTHER: "time off" }[booking.type];
  await postToSlack(
    settings.slackWebhookUrl,
    `${person.name ?? person.email} ${verb}: ${formatRange(toISO(booking.startDate), toISO(booking.endDate))} (${Number(
      booking.daysCount,
    )} days, ${kind})`,
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
  const holidays = await loadHolidays(workspace.id);
  const booking = await write(() =>
    db.booking.update({
      where: { id: existing.id },
      data: {
        ...prepare(input, settings, holidays),
        status,
        ...(status === "PENDING" ? { decidedById: null, decidedAt: null, decisionNote: null } : {}),
      },
    }),
  );
  if (status === "PENDING") await notifyAdminsOfRequest(workspace, existing.membership.user, booking, opts.origin);
  await announce(settings, existing.membership.user, booking, status === "PENDING" ? "changed a request" : "changed time off");
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
  if (opts.approve) await announce(opts.settings, booking.membership.user, booking, "is off");
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
  membership: { id: string; workspaceId: string; annualAllowanceDays: Prisma.Decimal | null },
  settings: Settings,
  year: number,
  holidays?: Set<ISODate>,
): Promise<AllowanceSummary> {
  const rules: DayRules = {
    countWeekends: settings.countWeekends,
    holidays: holidays ?? (await loadHolidays(membership.workspaceId)),
  };
  const { used, pending } = await vacationDaysInYear(membership.id, rules, year);
  if (membership.annualAllowanceDays === null) {
    return { year, allowance: null, carriedOver: 0, used, pending, remaining: null };
  }
  const base = Number(membership.annualAllowanceDays);
  let carriedOver = 0;
  if (settings.maxCarryOverDays) {
    const last = await vacationDaysInYear(membership.id, rules, year - 1);
    carriedOver = carryOver(base, last.used + last.pending, settings.maxCarryOverDays);
  }
  const allowance = base + carriedOver;
  return { year, allowance, carriedOver, used, pending, remaining: allowance - used - pending };
}
