import type { BookingStatus, BookingType, Prisma, Role, SpecialReason } from "@/generated/prisma/client";
import {
  allowanceIn,
  carriedOverStatus,
  carryOver,
  countDays,
  proratedAllowance,
  spanWithout,
  spansOverlap,
  validateSpan,
  type BookingSpan,
  type DayRules,
} from "@/lib/booking-days";
import { formatRange, fromISO, toISO, todayIn, type ISODate } from "@/lib/dates";
import { getMessages } from "@/lib/i18n/server";
import { formatNumber, isLocale, LOCALES, messagesFor, type Locale, type Messages } from "@/lib/i18n";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { postToChannels } from "@/lib/notify";
import { accessOf, isOverLimit } from "@/lib/plans";
import { recordAudit, bookingDetail } from "@/lib/audit";
import { isSampleEmail } from "@/lib/sample-team";
import { canRestore } from "@/lib/undo";
import { afterResponse } from "@/lib/background";
import { approveLinkUrl } from "@/lib/approve-link";

export const ACTIVE_STATUSES: BookingStatus[] = ["PENDING", "APPROVED"];

export type Settings = {
  approvalsEnabled: boolean;
  countWeekends: boolean;
  allowHalfDays: boolean;
  maxCarryOverDays: number | null;
  /** "MM-DD" by which carried-over days must be taken; null means they never expire. */
  carryOverExpiry: string | null;
  minPeoplePresent: number | null;
  /** Chat webhooks; null when not set or the plan doesn't include chat. */
  teamsWebhookUrl: string | null;
  slackWebhookUrl: string | null;
  /** Default region for regional holidays, e.g. "DE-BE". */
  holidayRegion: string | null;
  /** Language of chat posts and of emails to people who haven't picked one; English when unset. */
  locale?: Locale;
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
 * Hides other people's sick days from a viewer who isn't an admin: they show as "Other" without a note,
 * since being sick is health data (Art. 9 GDPR). Only the person and admins see them as sick, and only they
 * see why someone takes special leave.
 */
export function forViewer<T extends { type: BookingType; note: string | null; membershipId: string; specialReason?: SpecialReason | null }>(
  bookings: T[],
  viewer: { membershipId: string; role: Role },
): T[] {
  if (viewer.role === "ADMIN") return bookings;
  return bookings.map((b) => {
    if (b.membershipId === viewer.membershipId) return b;
    if (b.type === "SICK") return { ...b, type: "OTHER" as const, note: null };
    return b.specialReason ? { ...b, specialReason: null } : b;
  });
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

/** Holiday dates per region for several regions at once (each with the nationwide ones), in one query. */
export async function loadHolidaysByRegion(workspaceId: string, regions: Iterable<string>): Promise<Map<string, Set<ISODate>>> {
  const wanted = [...new Set(["", ...regions])];
  const rows = await db.holiday.findMany({ where: { workspaceId, region: { in: wanted } }, select: { date: true, region: true } });
  return new Map(wanted.map((r) => [r, new Set(rows.filter((h) => h.region === "" || h.region === r).map((h) => toISO(h.date)))]));
}

/**
 * Each booking with `days` counted under the holidays and work days that apply now, the same way the allowance
 * counts them. A booking's stored `daysCount` is what it was when saved; lists show this instead, so a holiday
 * imported or a work-day change later can't make a list say 5 days while "days left" counts 4.
 */
export async function withDays<
  T extends { startDate: Date; endDate: Date; startPart: string; endPart: string; membership: { holidayRegion?: string | null; workDays?: readonly number[] | null } },
>(workspaceId: string, settings: Settings, bookings: readonly T[]): Promise<(T & { days: number })[]> {
  if (bookings.length === 0) return [];
  const holidays = await loadHolidaysByRegion(workspaceId, bookings.map((b) => regionOf(b.membership, settings)));
  return bookings.map((b) => ({ ...b, days: countDays(spanOf(b), rulesFor(b.membership, settings, holidays.get(regionOf(b.membership, settings))!)) }));
}

export class BookingError extends Error {}

/** New and changed bookings stop when the team has more people than its plan allows. */
async function assertWithinPlan(workspaceId: string) {
  const ws = await db.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { plan: true, billingStatus: true, trialEndsAt: true, _count: { select: { memberships: { where: { removedAt: null, isSample: false } } } } },
  });
  const access = accessOf(ws);
  if (isOverLimit(access, ws._count.memberships)) {
    const t = (await getMessages()).errors;
    throw new BookingError(t.overLimit(access.kind === "trial" ? t.trial : access.name, access.maxMembers, ws._count.memberships));
  }
}

/** Converts a Booking row into the date-only span used by the day math. */
export function spanOf(b: { startDate: Date; endDate: Date; startPart: string; endPart: string }): BookingSpan {
  return {
    start: toISO(b.startDate),
    end: toISO(b.endDate),
    startPart: b.startPart as BookingSpan["startPart"],
    endPart: b.endPart as BookingSpan["endPart"],
  };
}

export function isOverlapError(e: unknown) {
  return String((e as Error)?.message ?? e).includes("Booking_no_overlap") || JSON.stringify(e ?? "").includes("Booking_no_overlap");
}

type Actor = { userId: string; membershipId: string; role: Role };

type BookingInput = BookingSpan & { type: BookingType; note: string | null; specialReason?: SpecialReason | null };

function prepare(input: BookingInput, settings: Settings, rules: DayRules, t: Messages["errors"]) {
  const error = validateSpan(input, settings);
  if (error) throw new BookingError(t[error]);
  const daysCount = countDays(input, rules);
  if (daysCount === 0) throw new BookingError(t.noWorkingDays);
  return {
    startDate: fromISO(input.start),
    endDate: fromISO(input.end),
    startPart: input.startPart,
    endPart: input.endPart,
    type: input.type,
    note: input.note,
    specialReason: input.type === "SPECIAL" ? (input.specialReason ?? null) : null,
    daysCount,
  };
}

/** Pending when approvals are on, unless an admin created it. Sick days are never asked for. */
function initialStatus(actor: Actor, settings: Settings, type?: BookingType): BookingStatus {
  return settings.approvalsEnabled && actor.role !== "ADMIN" && type !== "SICK" ? "PENDING" : "APPROVED";
}

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * Sick days during a vacation don't count as vacation (BUrlG §9): the vacation is cut around them and those
 * days come back. Only an admin may do it, because they check the sick note (eAU) outside the app; the app
 * keeps no note. Returns the vacation days given back.
 */
async function giveBackVacation(
  tx: Tx,
  opts: { membershipId: string; sick: BookingSpan; rules: DayRules; actor: Actor; exceptId?: string; t: Messages["errors"] },
): Promise<number> {
  const vacations = (
    await tx.booking.findMany({
      where: {
        membershipId: opts.membershipId,
        type: "VACATION",
        status: { in: ACTIVE_STATUSES },
        startDate: { lte: fromISO(opts.sick.end) },
        endDate: { gte: fromISO(opts.sick.start) },
        ...(opts.exceptId ? { id: { not: opts.exceptId } } : {}),
      },
    })
  ).filter((b) => spansOverlap(spanOf(b), opts.sick));
  if (vacations.length === 0) return 0;
  if (opts.actor.role !== "ADMIN") throw new BookingError(opts.t.sickInVacation);

  let returned = 0;
  for (const b of vacations) {
    const parts = spanWithout(spanOf(b), opts.sick)
      .map((span) => ({ span, daysCount: countDays(span, opts.rules) }))
      .filter((p) => p.daysCount > 0);
    // Counted now, like the allowance does, not the count stored when the vacation was booked.
    returned += countDays(spanOf(b), opts.rules) - parts.reduce((sum, p) => sum + p.daysCount, 0);
    if (parts.length === 0) {
      // Not restorable on its own: the sick days are in the way, and the vacation was never taken.
      await tx.booking.update({
        where: { id: b.id },
        data: { status: "CANCELLED", cancelledAt: new Date(), cancelledFrom: b.status, cancelReason: "SICK" },
      });
      continue;
    }
    // Shrink first, then add the part after, so the two never overlap on the way.
    const [first, ...rest] = parts;
    await tx.booking.update({ where: { id: b.id }, data: { ...dates(first.span), daysCount: first.daysCount } });
    for (const part of rest) {
      await tx.booking.create({
        data: {
          workspaceId: b.workspaceId,
          membershipId: b.membershipId,
          type: b.type,
          status: b.status,
          createdById: b.createdById,
          decidedById: b.decidedById,
          decidedAt: b.decidedAt,
          ...dates(part.span),
          daysCount: part.daysCount,
        },
      });
    }
  }
  return returned;
}

function dates(span: BookingSpan) {
  return { startDate: fromISO(span.start), endDate: fromISO(span.end), startPart: span.startPart, endPart: span.endPart };
}

async function write<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isOverlapError(e)) throw new BookingError((await getMessages()).errors.overlap);
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
  const t = (await getMessages()).errors;
  if (membershipId !== actor.membershipId && actor.role !== "ADMIN") {
    throw new BookingError(t.onlyAdminsBookForOthers);
  }
  await assertWithinPlan(workspace.id);
  const target = await db.membership.findFirst({
    where: { id: membershipId, workspaceId: workspace.id, removedAt: null },
    include: { user: true },
  });
  if (!target) throw new BookingError(t.memberNotInWorkspace);

  const status = initialStatus(actor, settings, input.type);
  const holidays = await loadHolidays(workspace.id, regionOf(target, settings));
  const rules = rulesFor(target, settings, holidays);
  const data = prepare(input, settings, rules, t);
  let returned = 0;
  const booking = await write(() =>
    db.$transaction(async (tx) => {
      if (input.type === "SICK") returned = await giveBackVacation(tx, { membershipId, sick: input, rules, actor, t });
      return tx.booking.create({
        data: {
          ...data,
          status,
          workspaceId: workspace.id,
          membershipId,
          createdById: actor.userId,
          ...(status === "APPROVED" && settings.approvalsEnabled && input.type !== "SICK" ? { decidedById: actor.userId, decidedAt: new Date() } : {}),
        },
      });
    }),
  );

  if (returned > 0) await recordVacationReturned(workspace.id, actor, target.user, input);
  // The booking is saved: emails and chat posts go out after the response, so a slow provider doesn't hold the person up.
  await afterResponse(async () => {
    if (status === "PENDING") await notifyAdminsOfRequest(workspace, settings, target.user, booking, opts.origin);
    if (input.type === "SICK" && actor.role !== "ADMIN") await notifyAdminsOfSickDays(workspace, settings, target.user, booking, opts.origin);
    await announce(
      workspace.id,
      settings,
      target.user,
      booking,
      status === "PENDING" ? "requested" : "off",
      `${opts.origin}/w/${workspace.slug}/calendar`,
      status === "PENDING" ? reviewUrl(opts.origin, workspace.slug, booking.id) : undefined,
    );
  });
  return booking;
}

/**
 * Where a chat post about a request sends admins: the request on Approvals. The channel is shared with everyone, so it
 * carries no approve link; Approvals asks for a sign-in and lets only admins decide.
 */
function reviewUrl(origin: string, slug: string, bookingId: string) {
  return `${origin}/w/${slug}/approvals#request-${bookingId}`;
}

/** Posts a one-line summary to the workspace's Teams and Slack channels, in the workspace's language. */
async function announce(
  workspaceId: string,
  settings: Settings,
  person: { name: string | null; email: string },
  booking: { startDate: Date; endDate: Date; daysCount: Prisma.Decimal | number; type: BookingType },
  verb: keyof Messages["chat"]["verb"],
  calendarUrl: string,
  /** Set for a pending request: the button opens it on Approvals instead of the calendar. */
  review?: string,
) {
  // Sample people are made up, so the team's channel never hears about them.
  if ((!settings.teamsWebhookUrl && !settings.slackWebhookUrl) || isSampleEmail(person.email)) return;
  const locale = settings.locale ?? "en";
  const { chat, common } = messagesFor(locale);
  // The channel is shared with colleagues, so sick days are posted as plain time off.
  const type = booking.type === "SICK" ? "OTHER" : booking.type;
  await postToChannels(
    settings,
    chat.booking(
      person.name ?? person.email,
      chat.verb[verb],
      formatRange(toISO(booking.startDate), toISO(booking.endDate), locale),
      common.days(formatNumber(Number(booking.daysCount), locale)),
      chat.kind[type],
    ),
    review
      ? { title: chat.reviewRequest, url: review }
      : { title: chat.openCalendar, url: `${calendarUrl}?month=${toISO(booking.startDate).slice(0, 7)}` },
    workspaceId,
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
  const t = (await getMessages()).errors;
  const existing = await db.booking.findFirst({
    where: { id: opts.bookingId, workspaceId: workspace.id, status: { in: ACTIVE_STATUSES } },
    include: { membership: { include: { user: true } } },
  });
  if (!existing) throw new BookingError(t.bookingNotFound);
  await assertWithinPlan(workspace.id);
  if (existing.membershipId !== actor.membershipId && actor.role !== "ADMIN") {
    throw new BookingError(t.onlyOwnChange);
  }

  // A member changing dates sends the booking back for approval.
  const status = initialStatus(actor, settings, input.type);
  const holidays = await loadHolidays(workspace.id, regionOf(existing.membership, settings));
  const rules = rulesFor(existing.membership, settings, holidays);
  const data = prepare(input, settings, rules, t);
  let returned = 0;
  const booking = await write(() =>
    db.$transaction(async (tx) => {
      if (input.type === "SICK") {
        returned = await giveBackVacation(tx, { membershipId: existing.membershipId, sick: input, rules, actor, exceptId: existing.id, t });
      }
      return tx.booking.update({
        where: { id: existing.id },
        data: { ...data, status, ...(status === "PENDING" ? { decidedById: null, decidedAt: null, decisionNote: null } : {}) },
      });
    }),
  );
  if (returned > 0) await recordVacationReturned(workspace.id, actor, existing.membership.user, input);
  await afterResponse(async () => {
    if (status === "PENDING") await notifyAdminsOfRequest(workspace, settings, existing.membership.user, booking, opts.origin);
    await announce(
      workspace.id,
      settings,
      existing.membership.user,
      booking,
      status === "PENDING" ? "changedRequest" : "changed",
      `${opts.origin}/w/${workspace.slug}/calendar`,
      status === "PENDING" ? reviewUrl(opts.origin, workspace.slug, booking.id) : undefined,
    );
  });
  return booking;
}

export async function cancelBooking(opts: { workspaceId: string; actor: Actor; bookingId: string }) {
  const t = (await getMessages()).errors;
  const booking = await db.booking.findFirst({
    where: { id: opts.bookingId, workspaceId: opts.workspaceId, status: { in: ACTIVE_STATUSES } },
    include: { membership: { include: { user: { select: { name: true, email: true } } } } },
  });
  if (!booking) throw new BookingError(t.bookingNotFound);
  if (booking.membershipId !== opts.actor.membershipId && opts.actor.role !== "ADMIN") {
    throw new BookingError(t.onlyOwnCancel);
  }
  // Remember what it was, so "Restore" puts it back as it was (approved stays approved).
  // Only while it is still as read, so a second tap or an approval at the same moment can't apply on top.
  const { count } = await db.booking.updateMany({
    where: { id: booking.id, status: booking.status },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelledFrom: booking.status, cancelReason: null },
  });
  if (count === 0) throw new BookingError(t.bookingNotFound);
  await recordAudit({
    workspaceId: opts.workspaceId,
    actorId: opts.actor.userId,
    action: "booking.cancelled",
    targetLabel: booking.membership.user.name ?? booking.membership.user.email,
    detail: bookingDetail(spanOf(booking)),
  });
}

/**
 * Puts a booking cancelled in the last RESTORE_DAYS back as it was. The person or an admin can do it;
 * bookings cancelled because the person was removed come back with the person instead (restoreMember).
 */
export async function restoreBooking(opts: {
  workspace: { id: string };
  settings: Settings;
  actor: Actor;
  bookingId: string;
}) {
  const t = (await getMessages()).errors;
  const booking = await db.booking.findFirst({
    where: { id: opts.bookingId, workspaceId: opts.workspace.id, status: "CANCELLED", cancelReason: null, membership: { removedAt: null } },
    include: { membership: { include: { user: { select: { name: true, email: true } } } } },
  });
  if (!booking) throw new BookingError(t.bookingNotFound);
  if (booking.membershipId !== opts.actor.membershipId && opts.actor.role !== "ADMIN") {
    throw new BookingError(t.onlyOwnChange);
  }
  if (!canRestore(booking.cancelledAt)) throw new BookingError(t.restoreExpired);
  await assertWithinPlan(opts.workspace.id);
  const { count } = await write(() =>
    db.booking.updateMany({
      where: { id: booking.id, status: "CANCELLED" },
      data: { status: booking.cancelledFrom ?? initialStatus(opts.actor, opts.settings), cancelledAt: null, cancelledFrom: null },
    }),
  );
  if (count === 0) throw new BookingError(t.bookingNotFound);
  await recordAudit({
    workspaceId: opts.workspace.id,
    actorId: opts.actor.userId,
    action: "booking.restored",
    targetLabel: booking.membership.user.name ?? booking.membership.user.email,
    detail: bookingDetail(spanOf(booking)),
  });
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
  const t = (await getMessages()).errors;
  if (opts.actor.role !== "ADMIN") throw new BookingError(t.onlyAdminsApprove);
  const booking = await db.booking.findFirst({
    where: { id: opts.bookingId, workspaceId: opts.workspace.id, status: "PENDING" },
    include: { membership: { include: { user: true } } },
  });
  if (!booking) throw new BookingError(t.alreadyHandled);

  // Only a booking that is still pending: when two admins (or a double tap) decide at once, one wins and the
  // other gets "already handled", so the person gets one email and the channel one post.
  const { count } = await db.booking.updateMany({
    where: { id: booking.id, status: "PENDING" },
    data: {
      status: opts.approve ? "APPROVED" : "REJECTED",
      decidedById: opts.actor.userId,
      decidedAt: new Date(),
      // The note goes out in the email only; it isn't stored.
      decisionNote: null,
    },
  });
  if (count === 0) throw new BookingError(t.alreadyHandled);

  const span = spanOf(booking);
  await recordAudit({
    workspaceId: opts.workspace.id,
    actorId: opts.actor.userId,
    action: opts.approve ? "booking.approved" : "booking.declined",
    targetLabel: booking.membership.user.name ?? booking.membership.user.email,
    detail: bookingDetail(span),
  });
  const locale = recipientLocale(booking.membership.user, opts.settings);
  const t2 = messagesFor(locale).email.decision;
  await afterResponse(async () => {
    await sendEmail({
      to: booking.membership.user.email,
      subject: t2.subject(opts.approve),
      text: [
        t2.text(formatRange(span.start, span.end, locale), opts.workspace.name, opts.approve),
        ...(opts.note ? [t2.note(opts.note)] : []),
        `${opts.origin}/w/${opts.workspace.slug}/me`,
      ].join("\n\n"),
    });
    if (opts.approve) {
      await announce(opts.workspace.id, opts.settings, booking.membership.user, booking, "off", `${opts.origin}/w/${opts.workspace.slug}/calendar`);
    }
  });
}

/** Approves everything still pending, used when approvals are switched off. */
export async function approveAllPending(workspaceId: string, actorId: string) {
  return db.booking.updateMany({
    where: { workspaceId, status: "PENDING" },
    data: { status: "APPROVED", decidedById: actorId, decidedAt: new Date() },
  });
}

/** The language for an email to this person: their own choice, else the workspace's. */
function recipientLocale(user: { locale?: string | null }, settings: Settings): Locale {
  return isLocale(user.locale) ? user.locale : (settings.locale ?? "en");
}

async function notifyAdminsOfRequest(
  workspace: { id: string; name: string; slug: string },
  settings: Settings,
  requester: { name: string | null; email: string },
  booking: { id: string; startDate: Date; endDate: Date; daysCount: Prisma.Decimal | number },
  origin: string,
) {
  const admins = await db.membership.findMany({
    where: { workspaceId: workspace.id, role: "ADMIN", removedAt: null },
    select: { id: true, user: { select: { email: true, locale: true } } },
  });
  const who = requester.name ?? requester.email;
  // One email per admin, in their language: the approve and decline links are signed for that admin (#33).
  for (const admin of admins) {
    const locale = recipientLocale(admin.user, settings);
    const { email, common } = messagesFor(locale);
    const link = { bookingId: booking.id, membershipId: admin.id };
    await sendEmail({
      to: admin.user.email,
      subject: email.request.subject(who),
      text: email.request.text(
        who,
        common.days(formatNumber(Number(booking.daysCount), locale)),
        formatRange(toISO(booking.startDate), toISO(booking.endDate), locale),
        workspace.name,
        {
          approve: approveLinkUrl(origin, link, "approve"),
          decline: approveLinkUrl(origin, link, "decline"),
          all: `${origin}/w/${workspace.slug}/approvals`,
        },
      ),
    });
  }
}

/** Tells admins in their language that someone reported sick; the email says nothing beyond the dates. */
async function notifyAdminsOfSickDays(
  workspace: { id: string; name: string; slug: string },
  settings: Settings,
  person: { name: string | null; email: string },
  booking: { startDate: Date; endDate: Date },
  origin: string,
) {
  const admins = await db.membership.findMany({
    where: { workspaceId: workspace.id, role: "ADMIN", removedAt: null },
    select: { user: { select: { email: true, locale: true } } },
  });
  const who = person.name ?? person.email;
  for (const locale of LOCALES) {
    const to = admins.filter((a) => recipientLocale(a.user, settings) === locale).map((a) => a.user.email);
    if (to.length === 0) continue;
    const { email } = messagesFor(locale);
    await sendEmail({
      to,
      subject: email.sick.subject(who),
      text: email.sick.text(
        who,
        formatRange(toISO(booking.startDate), toISO(booking.endDate), locale),
        workspace.name,
        `${origin}/w/${workspace.slug}/calendar?month=${toISO(booking.startDate).slice(0, 7)}`,
      ),
    });
  }
}

function recordVacationReturned(workspaceId: string, actor: Actor, person: { name: string | null; email: string }, sick: BookingSpan) {
  return recordAudit({
    workspaceId,
    actorId: actor.userId,
    action: "booking.vacation_returned",
    targetLabel: person.name ?? person.email,
    detail: bookingDetail(sick),
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
  /** Days carried over from last year, before any expired. */
  carriedOver: number;
  /** True when an admin entered the carried-over days instead of them being calculated from bookings. */
  carriedOverEntered: boolean;
  /** When carried-over days expire this year, if the workspace sets a deadline and this person isn't exempt from it. */
  carryOverExpiresOn: ISODate | null;
  /** Carried-over days still to take before the deadline. */
  carryOverLeft: number;
  /** Carried-over days lost because they weren't taken by the deadline; not part of `allowance`. */
  carryOverExpired: number;
  used: number;
  pending: number;
  remaining: number | null;
};

type VacationRow = { membershipId: string; status: BookingStatus; startDate: Date; endDate: Date; startPart: string; endPart: string };

/** Vacation days (approved, pending) between two dates, from one person's vacation bookings. */
function vacationDaysBetween(bookings: readonly VacationRow[], rules: DayRules, from: ISODate, to: ISODate) {
  let used = 0;
  let pending = 0;
  for (const b of bookings) {
    const span = spanOf(b);
    if (span.end < from || span.start > to) continue;
    const days = countDays(span, rules, { from, to });
    if (b.status === "APPROVED") used += days;
    else pending += days;
  }
  return { used, pending };
}

function vacationDaysInYear(bookings: readonly VacationRow[], rules: DayRules, year: number) {
  return vacationDaysBetween(bookings, rules, `${year}-01-01`, `${year}-12-31`);
}

/**
 * Call before changing allowances: keeps each member's current value as last year's, so the days
 * they carry over into this year don't change after the fact. A year already kept stays as it was.
 */
export async function keepLastYearsAllowance(
  memberships: readonly { id: string; annualAllowanceDays: Prisma.Decimal | null }[],
  newDays: number | null,
  thisYear: number,
) {
  const changing = memberships.filter(
    (m) => (m.annualAllowanceDays === null ? null : Number(m.annualAllowanceDays)) !== newDays,
  );
  if (changing.length === 0) return;
  await db.allowanceYear.createMany({
    data: changing.map((m) => ({ membershipId: m.id, year: thisYear - 1, days: m.annualAllowanceDays })),
    skipDuplicates: true,
  });
}

type AllowanceMember = {
  id: string;
  workspaceId: string;
  annualAllowanceDays: Prisma.Decimal | null;
  holidayRegion?: string | null;
  workDays?: readonly number[] | null;
  employmentStart?: Date | null;
  joinedAt: Date;
};

/** One person's allowance for `year`; see allowanceSummaries. `holidays` replaces the person's region's holidays. */
export async function allowanceSummary(
  membership: AllowanceMember,
  settings: Settings,
  year: number,
  holidays?: Set<ISODate>,
  today: ISODate = todayIn("UTC"),
): Promise<AllowanceSummary> {
  const summaries = await allowanceSummaries([membership], settings, year, today, holidays);
  return summaries.get(membership.id)!;
}

/**
 * Allowance for `year` of many people of one workspace at once, keyed by membership id. A fixed number of queries
 * however many people there are (holidays, vacation bookings, kept allowances, entered and exempt carry-over),
 * then the same day math as for one person, so a 75-person booking page doesn't use up the database connections.
 */
export async function allowanceSummaries(
  memberships: readonly AllowanceMember[],
  settings: Settings,
  year: number,
  today: ISODate = todayIn("UTC"),
  holidays?: Set<ISODate>,
): Promise<Map<string, AllowanceSummary>> {
  const result = new Map<string, AllowanceSummary>();
  if (memberships.length === 0) return result;
  const ids = memberships.map((m) => m.id);
  const workspaceId = memberships[0].workspaceId;
  const [byRegion, bookings, past, entered, noExpiry] = await Promise.all([
    holidays ? null : loadHolidaysByRegion(workspaceId, memberships.map((m) => regionOf(m, settings))),
    // Last year too, for what carries over.
    db.booking.findMany({
      where: {
        membershipId: { in: ids },
        type: "VACATION",
        status: { in: ACTIVE_STATUSES },
        startDate: { lte: fromISO(`${year}-12-31`) },
        endDate: { gte: fromISO(`${year - 1}-01-01`) },
      },
      select: { membershipId: true, status: true, startDate: true, endDate: true, startPart: true, endPart: true },
    }),
    db.allowanceYear.findMany({ where: { membershipId: { in: ids }, year: { in: [year - 1, year] } } }),
    db.carriedOver.findMany({ where: { membershipId: { in: ids }, year } }),
    db.keepCarriedOver.findMany({ where: { membershipId: { in: ids }, year }, select: { membershipId: true } }),
  ]);
  const exempt = new Set(noExpiry.map((k) => k.membershipId));
  for (const m of memberships) {
    result.set(
      m.id,
      summarize(m, settings, year, today, {
        rules: rulesFor(m, settings, holidays ?? byRegion!.get(regionOf(m, settings))!),
        bookings: bookings.filter((b) => b.membershipId === m.id),
        past: past.filter((p) => p.membershipId === m.id),
        entered: entered.find((e) => e.membershipId === m.id) ?? null,
        noExpiry: exempt.has(m.id),
      }),
    );
  }
  return result;
}

function summarize(
  membership: AllowanceMember,
  settings: Settings,
  year: number,
  today: ISODate,
  data: {
    rules: DayRules;
    bookings: VacationRow[];
    past: { year: number; days: Prisma.Decimal | null }[];
    entered: { days: Prisma.Decimal } | null;
    noExpiry: boolean;
  },
): AllowanceSummary {
  const { rules, bookings, entered } = data;
  const { used, pending } = vacationDaysInYear(bookings, rules, year);
  const current = membership.annualAllowanceDays === null ? null : Number(membership.annualAllowanceDays);
  const kept = data.past.map((p) => ({ year: p.year, days: p.days === null ? null : Number(p.days) }));
  const yearly = allowanceIn(year, current, kept);
  if (yearly === null) {
    return { year, allowance: null, carriedOver: 0, carriedOverEntered: false, carryOverExpiresOn: null, carryOverLeft: 0, carryOverExpired: 0, used, pending, remaining: null };
  }
  const employmentStart = membership.employmentStart ? toISO(membership.employmentStart) : null;
  const base = proratedAllowance(yearly, employmentStart, year);
  let carriedOver = 0;
  // Nothing carries over from a year the person wasn't here yet (by start date, else by joining date).
  const since = employmentStart ?? toISO(membership.joinedAt);
  const lastYearly = allowanceIn(year - 1, current, kept);
  if (entered) {
    // Entered by an admin for a team that moved over from Excel: their number counts, without the cap.
    carriedOver = Number(entered.days);
  } else if (settings.maxCarryOverDays && lastYearly !== null && Number(since.slice(0, 4)) < year) {
    const last = vacationDaysInYear(bookings, rules, year - 1);
    carriedOver = carryOver(proratedAllowance(lastYearly, employmentStart, year - 1), last.used + last.pending, settings.maxCarryOverDays);
  }
  let carryOverExpiresOn: ISODate | null = null;
  let carryOverLeft = 0;
  let carryOverExpired = 0;
  if (carriedOver > 0 && settings.carryOverExpiry && !data.noExpiry) {
    carryOverExpiresOn = `${year}-${settings.carryOverExpiry}`;
    const byDeadline = vacationDaysBetween(bookings, rules, `${year}-01-01`, carryOverExpiresOn);
    const status = carriedOverStatus(carriedOver, byDeadline.used + byDeadline.pending, today > carryOverExpiresOn);
    carryOverLeft = status.left;
    carryOverExpired = status.expired;
  }
  const allowance = base + carriedOver - carryOverExpired;
  return {
    year,
    allowance,
    carriedOver,
    carriedOverEntered: entered !== null,
    carryOverExpiresOn,
    carryOverLeft,
    carryOverExpired,
    used,
    pending,
    remaining: allowance - used - pending,
  };
}
