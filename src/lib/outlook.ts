import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { addDays, formatDate, type ISODate } from "@/lib/dates";
import type { Locale } from "@/lib/i18n";
import { messagesFor } from "@/lib/i18n";
import { decryptSecret, encryptSecret } from "@/lib/totp";

/**
 * Time off in the person's own Outlook calendar (#35). Someone connects their Microsoft account on Account (delegated
 * access, their consent only); approved time off then becomes an all-day "Out of office" event, and, if they chose it,
 * the automatic reply is scheduled for the next time off. Only events this app made are changed or deleted, and an
 * automatic reply the person set themselves is left alone. The refresh token is stored encrypted, nothing else of theirs.
 */

const LOGIN = "https://login.microsoftonline.com/common/oauth2/v2.0";
const GRAPH = "https://graph.microsoft.com/v1.0";
export const OUTLOOK_TIMEOUT_MS = 10_000;
const STATE_MINUTES = 15;

const CALENDAR_SCOPES = ["openid", "email", "offline_access", "User.Read", "Calendars.ReadWrite"];
const AUTO_REPLY_SCOPE = "MailboxSettings.ReadWrite";

type Env = Record<string, string | undefined>;

function credentials(env: Env = process.env) {
  const id = env.AUTH_MICROSOFT_ENTRA_ID_ID?.trim();
  const secret = env.AUTH_MICROSOFT_ENTRA_ID_SECRET?.trim();
  return id && secret ? { id, secret } : null;
}

/** Uses the app registration of "Sign in with Microsoft", so it is offered whenever that is set up. */
export function outlookAvailable(env: Env = process.env): boolean {
  return credentials(env) !== null;
}

export function scopesFor(autoReply: boolean): string {
  return [...CALENDAR_SCOPES, ...(autoReply ? [AUTO_REPLY_SCOPE] : [])].join(" ");
}

// ---------- connecting ----------

export type ConnectState = { userId: string; autoReply: boolean };

function sign(payload: string, secret: string): string {
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", `outlook-connect:${secret}`).update(payload).digest("base64url");
}

/** Names the person who started connecting and what they chose, for 15 minutes, so the answer can't land on someone else. */
export function connectState(state: ConnectState, now = new Date(), secret = process.env.AUTH_SECRET ?? ""): string {
  const expires = Math.floor(now.getTime() / 1000) + STATE_MINUTES * 60;
  const payload = Buffer.from(`${state.userId}.${state.autoReply ? 1 : 0}.${expires}`).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function readConnectState(token: string, now = new Date(), secret = process.env.AUTH_SECRET ?? ""): ConnectState | null {
  const [payload, mac, extra] = token.split(".");
  if (!payload || !mac || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const [userId, autoReply, expires, rest] = Buffer.from(payload, "base64url").toString("utf8").split(".");
  if (!userId || !/^[01]$/.test(autoReply ?? "") || rest !== undefined || !/^\d+$/.test(expires ?? "")) return null;
  if (Number(expires) * 1000 < now.getTime()) return null;
  return { userId, autoReply: autoReply === "1" };
}

export function redirectUri(origin: string): string {
  return `${origin}/api/outlook/callback`;
}

/** Microsoft's sign-in and consent page, for work and personal accounts. */
export function authorizeUrl(origin: string, state: string, autoReply: boolean, env: Env = process.env): string {
  const app = credentials(env);
  if (!app) throw new Error("Microsoft is not configured");
  const params = new URLSearchParams({
    client_id: app.id,
    response_type: "code",
    redirect_uri: redirectUri(origin),
    response_mode: "query",
    scope: scopesFor(autoReply),
    state,
    prompt: "select_account",
  });
  return `${LOGIN}/authorize?${params}`;
}

export const sealToken = (token: string, secret = process.env.AUTH_SECRET ?? "") => encryptSecret(token, secret, "outlook");
export const openToken = (stored: string, secret = process.env.AUTH_SECRET ?? "") => decryptSecret(stored, secret, "outlook");

// ---------- Microsoft ----------

export class OutlookError extends Error {
  /** `reconnect`: Microsoft no longer accepts the token or the access (password changed, access removed). */
  constructor(public readonly code: "reconnect" | "failed") {
    super(`outlook ${code}`);
  }
}

async function call(url: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(OUTLOOK_TIMEOUT_MS), cache: "no-store" });
  } catch {
    throw new OutlookError("failed");
  }
}

export type Tokens = { accessToken: string; refreshToken: string; scope: string };

async function token(body: Record<string, string>, env: Env): Promise<Tokens> {
  const app = credentials(env);
  if (!app) throw new OutlookError("reconnect");
  const res = await call(`${LOGIN}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: app.id, client_secret: app.secret, ...body }),
  });
  // invalid_grant and friends: the person has to connect again.
  if (res.status === 400 || res.status === 401) throw new OutlookError("reconnect");
  if (!res.ok) throw new OutlookError("failed");
  const json = (await res.json()) as { access_token?: unknown; refresh_token?: unknown; scope?: unknown };
  if (typeof json.access_token !== "string" || typeof json.refresh_token !== "string") throw new OutlookError("failed");
  return { accessToken: json.access_token, refreshToken: json.refresh_token, scope: typeof json.scope === "string" ? json.scope : "" };
}

export function redeemCode(code: string, origin: string, autoReply: boolean, env: Env = process.env): Promise<Tokens> {
  return token({ grant_type: "authorization_code", code, redirect_uri: redirectUri(origin), scope: scopesFor(autoReply) }, env);
}

/** A fresh access token. Microsoft hands out a new refresh token each time; the caller stores it. */
export function refreshTokens(refreshToken: string, autoReply: boolean, env: Env = process.env): Promise<Tokens> {
  return token({ grant_type: "refresh_token", refresh_token: refreshToken, scope: scopesFor(autoReply) }, env);
}

/** Calls Graph. 401 means the access is gone; 404 is returned to the caller (an event deleted in Outlook). */
export async function graph(accessToken: string, method: string, path: string, body?: unknown): Promise<Response> {
  const res = await call(`${GRAPH}${path}`, {
    method,
    headers: { authorization: `Bearer ${accessToken}`, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) throw new OutlookError("reconnect");
  if (!res.ok && res.status !== 404) throw new OutlookError(res.status === 403 ? "reconnect" : "failed");
  return res;
}

/** The address of the connected Microsoft account, to show which calendar is written to. */
export async function accountEmail(accessToken: string): Promise<string> {
  const res = await graph(accessToken, "GET", "/me?$select=mail,userPrincipalName");
  if (!res.ok) throw new OutlookError("failed");
  const me = (await res.json()) as { mail?: string | null; userPrincipalName?: string | null };
  return (me.mail || me.userPrincipalName || "").trim().toLowerCase().slice(0, 200);
}

// ---------- what goes into Outlook ----------

export type SyncBooking = {
  id: string;
  start: ISODate;
  end: ISODate;
  startPart: "FULL" | "AM" | "PM";
  endPart: "FULL" | "AM" | "PM";
  workspaceName: string;
  timeZone: string;
  standIn: { name: string | null; email: string } | null;
};

/**
 * The all-day "Out of office" event for one booking. It never says what kind of time off it is (the calendar may be
 * shared with colleagues), and a half day is named in the title, since an all-day event can't show half a day.
 */
export function eventFor(b: SyncBooking, locale: Locale) {
  const t = messagesFor(locale).outlook.event;
  const half = b.start === b.end && b.startPart === "PM" ? t.afternoon : b.start === b.end && b.endPart === "AM" ? t.morning : null;
  const notes = [
    b.start !== b.end && b.startPart === "PM" ? t.fromAfternoon(formatDate(b.start, undefined, locale)) : "",
    b.start !== b.end && b.endPart === "AM" ? t.untilMorning(formatDate(b.end, undefined, locale)) : "",
    t.body(b.workspaceName),
  ].filter(Boolean);
  return {
    subject: half ? `${t.subject} (${half})` : t.subject,
    body: { contentType: "text", content: notes.join("\n") },
    start: { dateTime: `${b.start}T00:00:00`, timeZone: b.timeZone },
    end: { dateTime: `${addDays(b.end, 1)}T00:00:00`, timeZone: b.timeZone },
    isAllDay: true,
    showAs: "oof",
    isReminderOn: false,
  };
}

export function eventHash(event: ReturnType<typeof eventFor>): string {
  return createHash("sha256").update(JSON.stringify(event)).digest("hex").slice(0, 32);
}

export type StoredEvent = { bookingId: string; eventId: string; hash: string; end: ISODate };

/**
 * What to change in Outlook so it matches the approved time off. Events of time off that is over are kept in the
 * calendar and only forgotten; the rest of what is no longer approved is deleted.
 */
export function planSync(wanted: { bookingId: string; hash: string }[], stored: StoredEvent[], today: ISODate) {
  const byBooking = new Map(stored.map((e) => [e.bookingId, e]));
  const wantedIds = new Set(wanted.map((w) => w.bookingId));
  return {
    create: wanted.filter((w) => !byBooking.has(w.bookingId)).map((w) => w.bookingId),
    update: wanted.filter((w) => byBooking.has(w.bookingId) && byBooking.get(w.bookingId)!.hash !== w.hash).map((w) => w.bookingId),
    remove: stored.filter((e) => !wantedIds.has(e.bookingId) && e.end >= today),
    forget: stored.filter((e) => !wantedIds.has(e.bookingId) && e.end < today),
  };
}

// ---------- automatic reply ----------

/**
 * The time off the automatic reply is for: the one going on or coming up next, joined with time off that follows
 * within three days (Friday to Monday), so a reply doesn't stop for a day in between.
 */
export function nextAbsence(bookings: SyncBooking[], today: ISODate): SyncBooking[] {
  const ahead = bookings.filter((b) => b.end >= today).sort((a, b) => a.start.localeCompare(b.start));
  if (ahead.length === 0) return [];
  const run = [ahead[0]];
  let end = ahead[0].end;
  for (const b of ahead.slice(1)) {
    // Friday to Monday is three days; anything further apart is a separate absence.
    if (b.start > addDays(end, 3)) break;
    run.push(b);
    if (b.end > end) end = b.end;
  }
  return run;
}

/** Wall-clock time in a time zone to the instant, e.g. ("2027-06-01T00:00", "Europe/Berlin") → 2027-05-31T22:00Z. */
export function zonedInstant(wall: string, timeZone: string): Date {
  const asUtc = new Date(`${wall}Z`);
  const offset = (at: Date) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
        .formatToParts(at)
        .map((p) => [p.type, p.value]),
    );
    return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second) - at.getTime();
  };
  const first = new Date(asUtc.getTime() - offset(asUtc));
  return new Date(asUtc.getTime() - offset(first));
}

export type AutoReplyWindow = { start: string; end: string; timeZone: string };

/** From the start of the first day (or noon for an afternoon) to the end of the last (or noon for a morning). */
export function replyWindow(run: SyncBooking[]): AutoReplyWindow {
  const first = run[0];
  const last = run.reduce((a, b) => (b.end > a.end ? b : a));
  return {
    start: `${first.start}T${first.startPart === "PM" ? "12" : "00"}:00:00`,
    end: last.endPart === "AM" ? `${last.end}T12:00:00` : `${addDays(last.end, 1)}T00:00:00`,
    timeZone: first.timeZone,
  };
}

/**
 * The reply text. Colleagues inside the organisation also read who stands in; people outside only read when the person
 * is back, so a colleague's address isn't handed to strangers.
 */
export function replyMessages(run: SyncBooking[], locale: Locale) {
  const t = messagesFor(locale).outlook.reply;
  const last = run.reduce((a, b) => (b.end > a.end ? b : a));
  const until = formatDate(last.end, { day: "numeric", month: "long", year: "numeric" }, locale);
  const standIn = run.find((b) => b.standIn)?.standIn ?? null;
  const external = t.external(until);
  const internal = standIn ? `${external}\n\n${t.standIn(standIn.name ? `${standIn.name} (${standIn.email})` : standIn.email)}` : external;
  return { internal, external };
}

type GraphDateTime = { dateTime?: string; timeZone?: string } | null | undefined;

/** The instant of a Graph date and time, when its time zone is one we can read (UTC or an IANA name); otherwise null. */
export function graphInstant(value: GraphDateTime): Date | null {
  if (!value?.dateTime) return null;
  const wall = value.dateTime.slice(0, 19);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(wall)) return null;
  const zone = value.timeZone ?? "UTC";
  if (zone === "UTC" || zone === "Etc/UTC") return new Date(`${wall}Z`);
  try {
    return zonedInstant(wall, zone);
  } catch {
    return null;
  }
}
