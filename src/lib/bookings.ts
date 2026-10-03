import type { BookingStatus, BookingType, Prisma, Role } from "@/generated/prisma/client";
import { carriedOverStatus, carryOver, countDays, proratedAllowance, validateSpan, type BookingSpan, type DayRules } from "@/lib/booking-days";
import { formatRange, fromISO, toISO, todayIn, type ISODate } from "@/lib/dates";
import { getMessages } from "@/lib/i18n/server";
import { formatNumber, isLocale, LOCALES, messagesFor, type Locale, type Messages } from "@/lib/i18n";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { postToChannels } from "@/lib/notify";
import { accessOf, isOverLimit } from "@/lib/plans";

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
  /** Show colleagues' sick leave as "Other", without its note. */
  hideSickType: boolean;
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

/** New and changed bookings stop when the team has more people than its plan allows. */
async function assertWithinPlan(workspaceId: string) {
  const ws = await db.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { plan: true, billingStatus: true, trialEndsAt: true, _count: { select: { memberships: { where: { removedAt: null } } } } },
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

function isOverlapError(e: unknown) {
  return String((e as Error)?.message ?? e).includes("Booking_no_overlap") || JSON.stringify(e ?? "").includes("Booking_no_overlap");
}

type Actor = { userId: string; membershipId: string; role: Role };

type BookingInput = BookingSpan & { type: BookingType; note: string | null };

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

  const status = initialStatus(actor, settings);
  const holidays = await loadHolidays(workspace.id, regionOf(target, settings));
  const booking = await write(() =>
    db.booking.create({
      data: {
        ...prepare(input, settings, rulesFor(target, settings, holidays), t),
        status,
        workspaceId: workspace.id,
        membershipId,
        createdById: actor.userId,
        ...(status === "APPROVED" && settings.approvalsEnabled ? { decidedById: actor.userId, decidedAt: new Date() } : {}),
      },
    }),
  );

  if (status === "PENDING") await notifyAdminsOfRequest(workspace, settings, target.user, booking, opts.origin);
  await announce(settings, target.user, booking, status === "PENDING" ? "requested" : "off", `${opts.origin}/w/${workspace.slug}/calendar`);
  return booking;
}

/** Posts a one-line summary to the workspace's Teams and Slack channels, in the workspace's language. */
async function announce(
  settings: Settings,
  person: { name: string | null; email: string },
  booking: { startDate: Date; endDate: Date; daysCount: Prisma.Decimal | number; type: BookingType },
  verb: keyof Messages["chat"]["verb"],
  calendarUrl: string,
) {
  if (!settings.teamsWebhookUrl && !settings.slackWebhookUrl) return;
  const locale = settings.locale ?? "en";
  const { chat, common } = messagesFor(locale);
  // The channel is shared with colleagues, so private sick leave is posted as plain time off.
  const type = settings.hideSickType && booking.type === "SICK" ? "OTHER" : booking.type;
  await postToChannels(
    settings,
    chat.booking(
      person.name ?? person.email,
      chat.verb[verb],
      formatRange(toISO(booking.startDate), toISO(booking.endDate), locale),
      common.days(formatNumber(Number(booking.daysCount), locale)),
      chat.kind[type],
    ),
    { title: chat.openCalendar, url: `${calendarUrl}?month=${toISO(booking.startDate).slice(0, 7)}` },
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
  const status = initialStatus(actor, settings);
  const holidays = await loadHolidays(workspace.id, regionOf(existing.membership, settings));
  const booking = await write(() =>
    db.booking.update({
      where: { id: existing.id },
      data: {
        ...prepare(input, settings, rulesFor(existing.membership, settings, holidays), t),
        status,
        ...(status === "PENDING" ? { decidedById: null, decidedAt: null, decisionNote: null } : {}),
      },
    }),
  );
  if (status === "PENDING") await notifyAdminsOfRequest(workspace, settings, existing.membership.user, booking, opts.origin);
  await announce(
    settings,
    existing.membership.user,
    booking,
    status === "PENDING" ? "changedRequest" : "changed",
    `${opts.origin}/w/${workspace.slug}/calendar`,
  );
  return booking;
}

export async function cancelBooking(opts: { workspaceId: string; actor: Actor; bookingId: string }) {
  const t = (await getMessages()).errors;
  const booking = await db.booking.findFirst({
    where: { id: opts.bookingId, workspaceId: opts.workspaceId, status: { in: ACTIVE_STATUSES } },
  });
  if (!booking) throw new BookingError(t.bookingNotFound);
  if (booking.membershipId !== opts.actor.membershipId && opts.actor.role !== "ADMIN") {
    throw new BookingError(t.onlyOwnCancel);
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
  const t = (await getMessages()).errors;
  if (opts.actor.role !== "ADMIN") throw new BookingError(t.onlyAdminsApprove);
  const booking = await db.booking.findFirst({
    where: { id: opts.bookingId, workspaceId: opts.workspace.id, status: "PENDING" },
    include: { membership: { include: { user: true } } },
  });
  if (!booking) throw new BookingError(t.alreadyHandled);

  await db.booking.update({
    where: { id: booking.id },
    data: {
      status: opts.approve ? "APPROVED" : "REJECTED",
      decidedById: opts.actor.userId,
      decidedAt: new Date(),
      // The note goes out in the email only; it isn't stored.
      decisionNote: null,
    },
  });

  const span = spanOf(booking);
  const locale = recipientLocale(booking.membership.user, opts.settings);
  const t2 = messagesFor(locale).email.decision;
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
    await announce(opts.settings, booking.membership.user, booking, "off", `${opts.origin}/w/${opts.workspace.slug}/calendar`);
  }
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
  booking: { startDate: Date; endDate: Date; daysCount: Prisma.Decimal | number },
  origin: string,
) {
  const admins = await db.membership.findMany({
    where: { workspaceId: workspace.id, role: "ADMIN", removedAt: null },
    select: { user: { select: { email: true, locale: true } } },
  });
  const who = requester.name ?? requester.email;
  // One email per language, so every admin reads it in theirs.
  for (const locale of LOCALES) {
    const to = admins.filter((a) => recipientLocale(a.user, settings) === locale).map((a) => a.user.email);
    if (to.length === 0) continue;
    const { email, common } = messagesFor(locale);
    await sendEmail({
      to,
      subject: email.request.subject(who),
      text: email.request.text(
        who,
        common.days(formatNumber(Number(booking.daysCount), locale)),
        formatRange(toISO(booking.startDate), toISO(booking.endDate), locale),
        workspace.name,
        `${origin}/w/${workspace.slug}/approvals`,
      ),
    });
  }
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
  /** When carried-over days expire this year, if the workspace sets a deadline. */
  carryOverExpiresOn: ISODate | null;
  /** Carried-over days still to take before the deadline. */
  carryOverLeft: number;
  /** Carried-over days lost because they weren't taken by the deadline; not part of `allowance`. */
  carryOverExpired: number;
  used: number;
  pending: number;
  remaining: number | null;
};

/** Vacation days (approved, pending) between two dates; sick and other leave don't count. */
async function vacationDaysBetween(membershipId: string, rules: DayRules, from: ISODate, to: ISODate) {
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

function vacationDaysInYear(membershipId: string, rules: DayRules, year: number) {
  return vacationDaysBetween(membershipId, rules, `${year}-01-01`, `${year}-12-31`);
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
  today: ISODate = todayIn("UTC"),
): Promise<AllowanceSummary> {
  const rules = rulesFor(membership, settings, holidays ?? (await loadHolidays(membership.workspaceId, regionOf(membership, settings))));
  const { used, pending } = await vacationDaysInYear(membership.id, rules, year);
  if (membership.annualAllowanceDays === null) {
    return { year, allowance: null, carriedOver: 0, carryOverExpiresOn: null, carryOverLeft: 0, carryOverExpired: 0, used, pending, remaining: null };
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
  let carryOverExpiresOn: ISODate | null = null;
  let carryOverLeft = 0;
  let carryOverExpired = 0;
  if (carriedOver > 0 && settings.carryOverExpiry) {
    carryOverExpiresOn = `${year}-${settings.carryOverExpiry}`;
    const byDeadline = await vacationDaysBetween(membership.id, rules, `${year}-01-01`, carryOverExpiresOn);
    const status = carriedOverStatus(carriedOver, byDeadline.used + byDeadline.pending, today > carryOverExpiresOn);
    carryOverLeft = status.left;
    carryOverExpired = status.expired;
  }
  const allowance = base + carriedOver - carryOverExpired;
  return {
    year,
    allowance,
    carriedOver,
    carryOverExpiresOn,
    carryOverLeft,
    carryOverExpired,
    used,
    pending,
    remaining: allowance - used - pending,
  };
}
