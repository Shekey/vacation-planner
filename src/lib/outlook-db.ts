import { afterResponse } from "@/lib/background";
import { forEachWithin } from "@/lib/cron";
import { fromISO, toISO, type ISODate } from "@/lib/dates";
import { db } from "@/lib/db";
import { isLocale, type Locale } from "@/lib/i18n";
import {
  accountEmail,
  eventFor,
  eventHash,
  graph,
  graphInstant,
  nextAbsence,
  openToken,
  OutlookError,
  planSync,
  readConnectState,
  redeemCode,
  refreshTokens,
  replyMessages,
  replyWindow,
  sealToken,
  zonedInstant,
  type SyncBooking,
} from "@/lib/outlook";

/** How long one sync may hold a person's calendar before another may start. */
const LEASE_MS = 2 * 60_000;
/** More upcoming time off than anyone books; a sync never writes more events than this. */
const MAX_EVENTS = 200;

export type ConnectOutcome = "connected" | "noAutoReply" | "declined" | "expired" | "failed";

/**
 * Microsoft's answer after someone approved access on its page. Counts only for the person who started it (the signed
 * state names them) and only within 15 minutes. Connecting again, for example to add the automatic reply, replaces
 * the token; connecting a different Microsoft account first removes what was added to the old one.
 */
export async function connectOutlook(opts: { state: string; code: string | null; error: string | null; userId: string; origin: string }): Promise<ConnectOutcome> {
  const state = readConnectState(opts.state);
  if (!state || state.userId !== opts.userId) return "expired";
  if (opts.error || !opts.code) return opts.error === "access_denied" ? "declined" : "failed";

  let tokens, email;
  try {
    tokens = await redeemCode(opts.code, opts.origin, state.autoReply);
    email = await accountEmail(tokens.accessToken);
  } catch (e) {
    if (e instanceof OutlookError) return "failed";
    throw e;
  }
  // The person may untick the automatic reply on Microsoft's page; then it stays off.
  const autoReply = state.autoReply && tokens.scope.toLowerCase().split(" ").includes("mailboxsettings.readwrite");

  const before = await db.outlookConnection.findUnique({ where: { userId: opts.userId } });
  if (before && before.accountEmail !== email) await removeEverything(before).catch(() => {});
  const data = { accountEmail: email, refreshToken: sealToken(tokens.refreshToken), autoReply, brokenAt: null, syncingUntil: null };
  await db.outlookConnection.upsert({ where: { userId: opts.userId }, create: { userId: opts.userId, ...data }, update: data });
  if (before && before.accountEmail !== email) await db.outlookEvent.deleteMany({ where: { connectionId: before.id } });

  await syncOutlook(opts.userId);
  return state.autoReply && !autoReply ? "noAutoReply" : "connected";
}

/** Removes the upcoming events and the automatic reply this app set, as far as Microsoft still lets us, then forgets the connection. */
export async function disconnectOutlook(userId: string) {
  const connection = await db.outlookConnection.findUnique({ where: { userId } });
  if (!connection) return;
  await removeEverything(connection).catch(() => {});
  await db.outlookConnection.delete({ where: { userId } });
}

/** Stops setting the automatic reply, and switches off the one this app scheduled. */
export async function stopAutoReply(userId: string) {
  const connection = await db.outlookConnection.findUnique({ where: { userId } });
  if (!connection?.autoReply) return;
  if (!connection.brokenAt) {
    await withToken(connection, async (token) => {
      await clearOwnReply(connection, token);
    }).catch(() => {});
  }
  await db.outlookConnection.update({ where: { userId }, data: { autoReply: false, autoReplyStart: null, autoReplyEnd: null } });
}

type Connection = NonNullable<Awaited<ReturnType<typeof db.outlookConnection.findUnique>>>;

/** A fresh access token; the new refresh token Microsoft hands out is stored. A token Microsoft refuses marks the connection broken. */
async function withToken<T>(connection: Connection, fn: (accessToken: string) => Promise<T>): Promise<T | undefined> {
  try {
    let refreshToken;
    try {
      refreshToken = openToken(connection.refreshToken);
    } catch {
      // Encrypted under an AUTH_SECRET that has since changed: only connecting again helps.
      throw new OutlookError("reconnect");
    }
    const tokens = await refreshTokens(refreshToken, connection.autoReply);
    await db.outlookConnection.update({ where: { id: connection.id }, data: { refreshToken: sealToken(tokens.refreshToken) } });
    return await fn(tokens.accessToken);
  } catch (e) {
    if (e instanceof OutlookError && e.code === "reconnect") {
      await db.outlookConnection.update({ where: { id: connection.id }, data: { brokenAt: new Date() } });
      return undefined;
    }
    throw e;
  }
}

async function removeEverything(connection: Connection) {
  if (connection.brokenAt) return;
  const today = toISO(new Date());
  await withToken(connection, async (token) => {
    const events = await db.outlookEvent.findMany({ where: { connectionId: connection.id, endDate: { gte: fromISO(today) } } });
    for (const e of events) await graph(token, "DELETE", `/me/events/${encodeURIComponent(e.eventId)}`);
    if (connection.autoReply) await clearOwnReply(connection, token);
  });
}

/**
 * Brings the person's Outlook up to date. One sync runs at a time per person: one asked for meanwhile is noted, and the
 * running one goes round again, so the last change always arrives.
 */
export async function syncOutlook(userId: string) {
  await db.outlookConnection.updateMany({ where: { userId }, data: { syncAskedAt: new Date() } });
  for (let round = 0; round < 3; round++) {
    const startedAt = new Date();
    const { count } = await db.outlookConnection.updateMany({
      where: { userId, brokenAt: null, OR: [{ syncingUntil: null }, { syncingUntil: { lt: startedAt } }] },
      data: { syncingUntil: new Date(startedAt.getTime() + LEASE_MS) },
    });
    if (count === 0) return;
    try {
      const connection = await db.outlookConnection.findUniqueOrThrow({ where: { userId }, include: { user: { select: { locale: true } } } });
      await withToken(connection, (token) => syncWith(connection, token, connection.user.locale));
    } finally {
      await db.outlookConnection.updateMany({ where: { userId }, data: { syncingUntil: null } });
    }
    const after = await db.outlookConnection.findUnique({ where: { userId }, select: { syncAskedAt: true } });
    if (!after?.syncAskedAt || after.syncAskedAt <= startedAt) return;
  }
}

async function approvedTimeOff(userId: string, today: ISODate) {
  const rows = await db.booking.findMany({
    where: {
      status: "APPROVED",
      endDate: { gte: fromISO(today) },
      membership: { userId, removedAt: null, isSample: false, workspace: { deletedAt: null } },
    },
    orderBy: { startDate: "asc" },
    take: MAX_EVENTS,
    select: {
      id: true,
      startDate: true,
      endDate: true,
      startPart: true,
      endPart: true,
      workspace: { select: { name: true, timezone: true, settings: { select: { locale: true } } } },
      standIn: { select: { removedAt: true, user: { select: { name: true, email: true } } } },
    },
  });
  return rows.map((b) => ({
    booking: {
      id: b.id,
      start: toISO(b.startDate),
      end: toISO(b.endDate),
      startPart: b.startPart,
      endPart: b.endPart,
      workspaceName: b.workspace.name,
      timeZone: b.workspace.timezone,
      standIn: b.standIn && !b.standIn.removedAt ? { name: b.standIn.user.name, email: b.standIn.user.email } : null,
    } satisfies SyncBooking,
    locale: b.workspace.settings?.locale,
  }));
}

async function syncWith(connection: Connection, token: string, userLocale: string | null) {
  const today = toISO(new Date());
  const timeOff = await approvedTimeOff(connection.userId, today);
  const locale: Locale = isLocale(userLocale) ? userLocale : isLocale(timeOff[0]?.locale) ? (timeOff[0].locale as Locale) : "en";
  const bookings = timeOff.map((t) => t.booking);
  const events = new Map(bookings.map((b) => [b.id, eventFor(b, locale)]));
  const wanted = bookings.map((b) => ({ bookingId: b.id, hash: eventHash(events.get(b.id)!) }));
  const stored = await db.outlookEvent.findMany({ where: { connectionId: connection.id } });
  const byBooking = new Map(stored.map((e) => [e.bookingId, e]));
  const plan = planSync(
    wanted,
    stored.map((e) => ({ bookingId: e.bookingId, eventId: e.eventId, hash: e.hash, end: toISO(e.endDate) })),
    today,
  );

  const save = async (bookingId: string, eventId: string) => {
    const b = bookings.find((x) => x.id === bookingId)!;
    const row = { eventId, hash: wanted.find((w) => w.bookingId === bookingId)!.hash, endDate: fromISO(b.end) };
    await db.outlookEvent.upsert({
      where: { connectionId_bookingId: { connectionId: connection.id, bookingId } },
      create: { connectionId: connection.id, bookingId, ...row },
      update: row,
    });
  };
  const create = async (bookingId: string) => {
    const res = await graph(token, "POST", "/me/events", events.get(bookingId));
    const made = (await res.json()) as { id?: unknown };
    if (!res.ok || typeof made.id !== "string") throw new OutlookError("failed");
    await save(bookingId, made.id);
  };

  for (const bookingId of plan.create) await create(bookingId);
  for (const bookingId of plan.update) {
    const res = await graph(token, "PATCH", `/me/events/${encodeURIComponent(byBooking.get(bookingId)!.eventId)}`, events.get(bookingId));
    // Deleted in Outlook by hand: the time off is still on, so it's added again.
    if (res.status === 404) await create(bookingId);
    else await save(bookingId, byBooking.get(bookingId)!.eventId);
  }
  for (const e of plan.remove) {
    await graph(token, "DELETE", `/me/events/${encodeURIComponent(e.eventId)}`);
    await db.outlookEvent.delete({ where: { connectionId_bookingId: { connectionId: connection.id, bookingId: e.bookingId } } });
  }
  if (plan.forget.length > 0) {
    await db.outlookEvent.deleteMany({ where: { connectionId: connection.id, bookingId: { in: plan.forget.map((e) => e.bookingId) } } });
  }

  if (connection.autoReply) await scheduleReply(connection, token, bookings, today, locale);
  await db.outlookConnection.update({ where: { id: connection.id }, data: { lastSyncedAt: new Date() } });
}

type ReplySetting = {
  status?: string;
  scheduledStartDateTime?: { dateTime?: string; timeZone?: string };
  scheduledEndDateTime?: { dateTime?: string; timeZone?: string };
};

async function currentReply(token: string): Promise<ReplySetting> {
  const res = await graph(token, "GET", "/me/mailboxSettings/automaticRepliesSetting");
  if (!res.ok) throw new OutlookError("failed");
  return (await res.json()) as ReplySetting;
}

/** Whether the reply in Outlook is the one this app scheduled last (same window), so it may be changed or switched off. */
function isOwn(connection: Connection, reply: ReplySetting): boolean {
  if (reply.status !== "scheduled" || !connection.autoReplyStart || !connection.autoReplyEnd) return false;
  return (
    graphInstant(reply.scheduledStartDateTime)?.getTime() === connection.autoReplyStart.getTime() &&
    graphInstant(reply.scheduledEndDateTime)?.getTime() === connection.autoReplyEnd.getTime()
  );
}

const html = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

/** Graph's date and time in UTC, which every mailbox understands. */
const utc = (instant: Date) => ({ dateTime: instant.toISOString().slice(0, 19), timeZone: "UTC" });

/**
 * Schedules the automatic reply for the next time off. Left alone when the person set one themselves: switched on
 * without an end, or scheduled for a time that isn't over and isn't the one this app set.
 */
async function scheduleReply(connection: Connection, token: string, bookings: SyncBooking[], today: ISODate, locale: Locale) {
  try {
    const reply = await currentReply(token);
    const own = isOwn(connection, reply);
    const theirs =
      reply.status === "alwaysEnabled" ||
      (reply.status === "scheduled" && !own && (graphInstant(reply.scheduledEndDateTime)?.getTime() ?? Infinity) > Date.now());
    if (theirs) return;

    const run = nextAbsence(bookings, today);
    if (run.length === 0) {
      if (own) await clearOwnReply(connection, token);
      return;
    }
    const window = replyWindow(run);
    const start = zonedInstant(window.start, window.timeZone);
    const end = zonedInstant(window.end, window.timeZone);
    const text = replyMessages(run, locale);
    await graph(token, "PATCH", "/me/mailboxSettings", {
      automaticRepliesSetting: {
        status: "scheduled",
        externalAudience: "all",
        scheduledStartDateTime: utc(start),
        scheduledEndDateTime: utc(end),
        internalReplyMessage: html(text.internal),
        externalReplyMessage: html(text.external),
      },
    });
    await db.outlookConnection.update({ where: { id: connection.id }, data: { autoReplyStart: start, autoReplyEnd: end } });
  } catch (e) {
    // 403: the mailbox doesn't allow it (the permission was taken back). The calendar keeps working without the reply.
    if (e instanceof OutlookError && e.code === "reconnect") {
      await db.outlookConnection.update({ where: { id: connection.id }, data: { autoReply: false, autoReplyStart: null, autoReplyEnd: null } });
      return;
    }
    throw e;
  }
}

async function clearOwnReply(connection: Connection, token: string) {
  try {
    const reply = await currentReply(token);
    if (isOwn(connection, reply)) await graph(token, "PATCH", "/me/mailboxSettings", { automaticRepliesSetting: { status: "disabled" } });
  } catch (e) {
    // Without the permission there is nothing of ours to switch off; that mustn't mark the calendar connection broken.
    if (!(e instanceof OutlookError && e.code === "reconnect")) throw e;
  }
  await db.outlookConnection.update({ where: { id: connection.id }, data: { autoReplyStart: null, autoReplyEnd: null } });
}

/**
 * After a booking changed: brings the Outlook of its person up to date once the response is sent. Nothing happens for
 * people who haven't connected Outlook.
 */
export async function syncOutlookSoon(membershipId: string) {
  const connection = await db.outlookConnection.findFirst({
    where: { brokenAt: null, user: { memberships: { some: { id: membershipId } } } },
    select: { userId: true },
  });
  if (connection) await afterResponse(() => syncOutlook(connection.userId));
}

/** The nightly run: catches changes made where no sync was started (removed members, approvals switched off, automatic approval). */
export async function syncAllOutlook() {
  const connections = await db.outlookConnection.findMany({ where: { brokenAt: null }, select: { userId: true } });
  // Runs after the other housekeeping in the same 60-second request, so it gets less time; what is left waits a night.
  return forEachWithin(connections, (c) => syncOutlook(c.userId), { budgetMs: 20_000 });
}
