import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { disconnectOutlookAction, stopAutoReplyAction } from "@/app/account/actions";
import { GET as callback } from "@/app/api/outlook/callback/route";
import { deleteAccount } from "@/lib/account";
import { cancelBooking, createBooking, decideBooking, restoreBooking, updateBooking } from "@/lib/bookings";
import { db } from "@/lib/db";
import { connectState } from "@/lib/outlook";
import { syncAllOutlook, syncOutlook } from "@/lib/outlook-db";
import { makeWorkspace } from "@/test/db";

vi.mock("@/auth", () => ({ auth: vi.fn(async () => null), signIn: vi.fn(), signOut: vi.fn() }));

const origin = "https://app.test";
const week = { type: "VACATION" as const, note: null, start: "2030-03-04", end: "2030-03-08", startPart: "FULL" as const, endPart: "FULL" as const };
const later = { ...week, start: "2030-04-01", end: "2030-04-05" };

type Team = Awaited<ReturnType<typeof makeWorkspace>>;
type Event = { subject: string; start: { dateTime: string; timeZone: string }; end: { dateTime: string; timeZone: string }; showAs: string };
type Reply = { status: string; scheduledStartDateTime?: { dateTime: string; timeZone: string }; scheduledEndDateTime?: { dateTime: string; timeZone: string }; internalReplyMessage?: string; externalReplyMessage?: string };

/**
 * A pretend Microsoft for one person: the token endpoint, their calendar and their automatic reply. `refuse` makes it
 * turn the refresh token down, as after a password change; `noMailbox` grants everything but the mailbox settings.
 */
function fakeMicrosoft(opts: { refuse?: boolean; noMailbox?: boolean; reply?: Reply } = {}) {
  const calls: string[] = [];
  const events = new Map<string, Event>();
  const state = { reply: opts.reply ?? ({ status: "disabled" } as Reply), refuse: opts.refuse ?? false, issued: 0 };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? "GET";
      calls.push(`${method} ${url.pathname}`);
      if (url.hostname === "login.microsoftonline.com") {
        const body = new URLSearchParams(String(init?.body));
        if (body.get("client_secret") !== "ms-secret") return json({ error: "invalid_client" }, 401);
        if (body.get("grant_type") === "authorization_code" && body.get("code") !== "good") return json({ error: "invalid_grant" }, 400);
        if (body.get("grant_type") === "refresh_token" && (state.refuse || !body.get("refresh_token")?.startsWith("rt-"))) return json({ error: "invalid_grant" }, 400);
        const scope = (body.get("scope") ?? "").split(" ").filter((s) => !(opts.noMailbox && s === "MailboxSettings.ReadWrite"));
        state.issued++;
        return json({ access_token: `at-${state.issued}`, refresh_token: `rt-${state.issued}`, scope: scope.join(" ") });
      }
      if (url.hostname !== "graph.microsoft.com") throw new Error(`unexpected fetch ${url.href}`);
      if (!new Headers(init?.headers).get("authorization")?.startsWith("Bearer at-")) return json({}, 401);
      const path = url.pathname.replace("/v1.0", "");
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      if (path === "/me") return json({ mail: "Person@Firma.de", userPrincipalName: "person@firma.de" });
      if (path === "/me/events" && method === "POST") {
        const id = `ev-${events.size + calls.length}`;
        events.set(id, body);
        return json({ id }, 201);
      }
      const event = /^\/me\/events\/(.+)$/.exec(path)?.[1];
      if (event) {
        if (!events.has(event)) return json({ error: "ErrorItemNotFound" }, 404);
        if (method === "PATCH") events.set(event, body);
        if (method === "DELETE") events.delete(event);
        return new Response(null, { status: method === "DELETE" ? 204 : 200 });
      }
      if (path.startsWith("/me/mailboxSettings")) {
        if (opts.noMailbox) return json({ error: "ErrorAccessDenied" }, 403);
        if (method === "GET") return json(state.reply);
        state.reply = { ...state.reply, ...body.automaticRepliesSetting };
        return json({});
      }
      return json({ error: "not found" }, 404);
    }),
  );
  return { calls, events, state };
}

const signInAs = (user: { id: string; email: string }) =>
  vi.mocked(auth).mockResolvedValue({ user: { id: user.id, email: user.email, name: "Member" }, expires: "2099-01-01" } as never);

/** Comes back from Microsoft's page, signed in as `as`, with a state started by `startedBy`. */
async function returnFromMicrosoft(team: Team, opts: { autoReply?: boolean; startedBy?: string; query?: string } = {}) {
  signInAs({ id: team.member.userId, email: team.member.user.email });
  const state = connectState({ userId: opts.startedBy ?? team.member.userId, autoReply: opts.autoReply ?? false });
  const res = await callback(new Request(`${origin}/api/outlook/callback?${opts.query ?? "code=good"}&state=${encodeURIComponent(state)}`));
  return new URL(res.headers.get("location")!).searchParams.get("outlook");
}

const book = (t: Team, input = week, actor = t.member.actor) =>
  createBooking({ workspace: t.workspace, settings: t.settings, actor, membershipId: t.member.id, input, origin });
const approve = (t: Team, bookingId: string) =>
  decideBooking({ workspace: t.workspace, settings: t.settings, actor: t.admin.actor, bookingId, approve: true, note: null, origin });
const connectionOf = (t: Team) => db.outlookConnection.findUnique({ where: { userId: t.member.userId }, include: { events: true } });

beforeEach(() => {
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID = "ms-app";
  process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET = "ms-secret";
  process.env.AUTH_SECRET ??= "test-auth-secret";
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(auth).mockResolvedValue(null as never);
  delete process.env.AUTH_MICROSOFT_ENTRA_ID_ID;
  delete process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET;
});

describe("connecting Outlook", () => {
  it("adds the approved time off as 'Out of office', not requests, and keeps the token encrypted", async () => {
    const t = await makeWorkspace({ approvalsEnabled: true });
    await db.workspace.update({ where: { id: t.workspace.id }, data: { timezone: "Europe/Berlin" } });
    const request = await book(t);
    const approved = await book(t, later);
    await approve(t, approved.id);
    const ms = fakeMicrosoft();

    expect(await returnFromMicrosoft(t)).toBe("connected");
    const connection = await connectionOf(t);
    expect(connection?.accountEmail).toBe("person@firma.de");
    expect(connection?.refreshToken).not.toMatch(/rt-/);
    expect(connection?.events.map((e) => e.bookingId)).toEqual([approved.id]);
    expect([...ms.events.values()]).toEqual([
      expect.objectContaining({ subject: "Out of office", showAs: "oof", start: { dateTime: "2030-04-01T00:00:00", timeZone: "Europe/Berlin" } }),
    ]);
    expect(connection?.events.some((e) => e.bookingId === request.id)).toBe(false);
  });

  it("only counts for the person who started it, and not when they declined", async () => {
    const t = await makeWorkspace();
    const ms = fakeMicrosoft();
    expect(await returnFromMicrosoft(t, { startedBy: t.admin.userId })).toBe("expired");
    expect(await returnFromMicrosoft(t, { query: "error=access_denied" })).toBe("declined");
    expect(await connectionOf(t)).toBeNull();
    expect(ms.calls).toEqual([]);
  });
});

describe("keeping Outlook up to date", () => {
  it("follows approvals, changes, cancellations and restores", async () => {
    const t = await makeWorkspace({ approvalsEnabled: true });
    const ms = fakeMicrosoft();
    await returnFromMicrosoft(t);
    const request = await book(t);
    expect(ms.events.size).toBe(0);

    await approve(t, request.id);
    expect([...ms.events.values()].map((e) => e.start.dateTime)).toEqual(["2030-03-04T00:00:00"]);

    // Admins' changes stay approved; the event moves along.
    await updateBooking({ workspace: t.workspace, settings: t.settings, actor: t.admin.actor, bookingId: request.id, input: { ...week, end: "2030-03-06" }, origin });
    expect([...ms.events.values()].map((e) => e.end.dateTime)).toEqual(["2030-03-07T00:00:00"]);
    expect(ms.calls.filter((c) => c.startsWith("PATCH /v1.0/me/events/"))).toHaveLength(1);

    await cancelBooking({ workspaceId: t.workspace.id, actor: t.member.actor, bookingId: request.id });
    expect(ms.events.size).toBe(0);
    expect((await connectionOf(t))?.events).toEqual([]);

    await restoreBooking({ workspace: t.workspace, settings: t.settings, actor: t.member.actor, bookingId: request.id });
    expect(ms.events.size).toBe(1);
  });

  it("removes the event when a member's change sends the time off back for approval", async () => {
    const t = await makeWorkspace({ approvalsEnabled: true });
    const ms = fakeMicrosoft();
    await returnFromMicrosoft(t);
    const booking = await book(t);
    await approve(t, booking.id);
    await updateBooking({ workspace: t.workspace, settings: t.settings, actor: t.member.actor, bookingId: booking.id, input: later, origin });
    expect(ms.events.size).toBe(0);
  });

  it("adds an event again that was deleted in Outlook, and writes nothing when nothing changed", async () => {
    const t = await makeWorkspace();
    const ms = fakeMicrosoft();
    await returnFromMicrosoft(t);
    const booking = await book(t);
    ms.events.clear();
    await updateBooking({ workspace: t.workspace, settings: t.settings, actor: t.member.actor, bookingId: booking.id, input: { ...week, end: "2030-03-07" }, origin });
    expect(ms.events.size).toBe(1);

    const writes = ms.calls.filter((c) => !c.startsWith("POST /common") && !c.startsWith("GET")).length;
    await syncOutlook(t.member.userId);
    expect(ms.calls.filter((c) => !c.startsWith("POST /common") && !c.startsWith("GET")).length).toBe(writes);
  });

  it("leaves time off that is over in the calendar", async () => {
    const t = await makeWorkspace();
    const ms = fakeMicrosoft();
    await returnFromMicrosoft(t);
    const booking = await book(t);
    // As if the week were over and the booking later gone (deleted with old data).
    const connection = await connectionOf(t);
    await db.outlookEvent.updateMany({ where: { connectionId: connection!.id }, data: { endDate: new Date("2027-05-01") } });
    await db.booking.delete({ where: { id: booking.id } });
    await syncOutlook(t.member.userId);
    expect(ms.events.size).toBe(1);
    expect((await connectionOf(t))?.events).toEqual([]);
  });

  it("removes the events of someone removed from the workspace in the nightly run", async () => {
    const t = await makeWorkspace();
    const ms = fakeMicrosoft();
    await returnFromMicrosoft(t);
    await book(t);
    await db.membership.update({ where: { id: t.member.id }, data: { removedAt: new Date() } });
    await syncAllOutlook();
    expect(ms.events.size).toBe(0);
  });

  it("stops and asks to connect again when Microsoft refuses the token", async () => {
    const t = await makeWorkspace();
    const ms = fakeMicrosoft();
    await returnFromMicrosoft(t);
    ms.state.refuse = true;
    await book(t);
    expect((await connectionOf(t))?.brokenAt).not.toBeNull();
    ms.calls.length = 0;
    await book(t, later);
    expect(ms.calls).toEqual([]);

    ms.state.refuse = false;
    expect(await returnFromMicrosoft(t)).toBe("connected");
    const connection = await connectionOf(t);
    expect(connection?.brokenAt).toBeNull();
    expect(ms.events.size).toBe(2);
  });
});

describe("the automatic reply", () => {
  it("is scheduled for the next time off, with the stand-in for colleagues only", async () => {
    const t = await makeWorkspace();
    await db.workspace.update({ where: { id: t.workspace.id }, data: { timezone: "Europe/Berlin" } });
    const ms = fakeMicrosoft();
    expect(await returnFromMicrosoft(t, { autoReply: true })).toBe("connected");
    const booking = await createBooking({
      workspace: t.workspace,
      settings: t.settings,
      actor: t.member.actor,
      membershipId: t.member.id,
      input: { ...week, standInId: t.admin.id },
      origin,
    });
    await book(t, later);

    expect(ms.state.reply).toMatchObject({
      status: "scheduled",
      scheduledStartDateTime: { dateTime: "2030-03-03T23:00:00", timeZone: "UTC" },
      scheduledEndDateTime: { dateTime: "2030-03-08T23:00:00", timeZone: "UTC" },
    });
    expect(ms.state.reply.internalReplyMessage).toContain(t.admin.user.email);
    expect(ms.state.reply.externalReplyMessage).not.toContain(t.admin.user.email);
    expect(ms.state.reply.externalReplyMessage).toContain("8 March 2030");

    // Cancelled: the reply moves on to the next time off, and is switched off once there is none.
    await cancelBooking({ workspaceId: t.workspace.id, actor: t.member.actor, bookingId: booking.id });
    expect(ms.state.reply.scheduledStartDateTime?.dateTime).toBe("2030-03-31T22:00:00");
    signInAs({ id: t.member.userId, email: t.member.user.email });
    await stopAutoReplyAction();
    expect(ms.state.reply.status).toBe("disabled");
    expect((await connectionOf(t))?.autoReply).toBe(false);
  });

  it("never touches a reply the person set themselves", async () => {
    const t = await makeWorkspace();
    const own: Reply = { status: "alwaysEnabled", internalReplyMessage: "On parental leave" };
    const ms = fakeMicrosoft({ reply: own });
    await returnFromMicrosoft(t, { autoReply: true });
    await book(t);
    expect(ms.state.reply).toEqual(own);

    const scheduled: Reply = {
      status: "scheduled",
      scheduledStartDateTime: { dateTime: "2030-01-01T00:00:00", timeZone: "UTC" },
      scheduledEndDateTime: { dateTime: "2030-01-10T00:00:00", timeZone: "UTC" },
    };
    ms.state.reply = scheduled;
    await syncOutlook(t.member.userId);
    expect(ms.state.reply).toEqual(scheduled);
  });

  it("stays off when Microsoft didn't grant the mailbox settings", async () => {
    const t = await makeWorkspace();
    const ms = fakeMicrosoft({ noMailbox: true });
    expect(await returnFromMicrosoft(t, { autoReply: true })).toBe("noAutoReply");
    await book(t);
    const connection = await connectionOf(t);
    expect(connection?.autoReply).toBe(false);
    expect(connection?.brokenAt).toBeNull();
    expect(ms.events.size).toBe(1);
  });
});

describe("disconnecting", () => {
  it("removes the upcoming events and the reply it set, then forgets the connection", async () => {
    const t = await makeWorkspace();
    const ms = fakeMicrosoft();
    await returnFromMicrosoft(t, { autoReply: true });
    await book(t);
    expect(ms.state.reply.status).toBe("scheduled");

    signInAs({ id: t.member.userId, email: t.member.user.email });
    await disconnectOutlookAction();
    expect(ms.events.size).toBe(0);
    expect(ms.state.reply.status).toBe("disabled");
    expect(await connectionOf(t)).toBeNull();
  });

  it("also happens when the account is deleted", async () => {
    const t = await makeWorkspace();
    const ms = fakeMicrosoft();
    await returnFromMicrosoft(t);
    await book(t);
    expect(ms.events.size).toBe(1);
    await deleteAccount(t.member.userId);
    expect(ms.events.size).toBe(0);
  });

  it("never adds a colleague's time off", async () => {
    const t = await makeWorkspace();
    const ms = fakeMicrosoft();
    await returnFromMicrosoft(t);
    await createBooking({ workspace: t.workspace, settings: t.settings, actor: t.admin.actor, membershipId: t.admin.id, input: week, origin });
    expect(ms.events.size).toBe(0);
  });
});
