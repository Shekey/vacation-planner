import { describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { createAssistantTokenAction, revokeAssistantTokenAction } from "@/app/account/actions";
import { POST } from "@/app/api/mcp/route";
import { CALLS_PER_MINUTE, previewToken } from "@/lib/assistant";
import { createBooking } from "@/lib/bookings";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { createPersonalToken } from "@/lib/personal-tokens";
import { makeUser, makeWorkspace } from "@/test/db";

vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));

/** Assistant access over MCP (#45), through the real /api/mcp route. "Today" is 2027-06-01 in tests. */

type Team = Awaited<ReturnType<typeof makeWorkspace>>;
const origin = "https://app.test";

async function tokenFor(membershipId: string) {
  return (await createPersonalToken({ membershipId, name: "Test", days: 30 })).token;
}

async function rpc(token: string | null, method: string, params: Record<string, unknown> = {}) {
  const res = await POST(
    new Request(`${origin}/api/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
  );
  return { status: res.status, body: await res.json() };
}

/** Calls a tool; `data` is its JSON answer, `error` the message when it refused. */
async function call(token: string, name: string, args: Record<string, unknown> = {}) {
  const { status, body } = await rpc(token, "tools/call", { name, arguments: args });
  expect(status).toBe(200);
  const text: string = body.result?.content?.[0]?.text ?? body.error?.message ?? "";
  if (body.result?.isError || body.error) return { error: text, data: null };
  return { error: null, data: JSON.parse(text) };
}

const toolsOf = async (token: string) => ((await rpc(token, "tools/list")).body.result.tools as { name: string }[]).map((t) => t.name).sort();

const week = (start: string, end: string) => ({ type: "VACATION" as const, note: null, start, end, startPart: "FULL" as const, endPart: "FULL" as const });
const bookInApp = (t: Team, m: Team["admin"] | Team["member"], start: string, end: string, type: "VACATION" | "SICK" = "VACATION") =>
  createBooking({ workspace: t.workspace, settings: t.settings, actor: t.admin.actor, membershipId: m.id, input: { ...week(start, end), type }, origin });

describe("the token", () => {
  it("is refused when missing, unknown, expired, revoked, or the person has left", async () => {
    const t = await makeWorkspace();
    expect((await rpc(null, "tools/list")).status).toBe(401);
    expect((await rpc("ufl_not-a-real-token", "tools/list")).status).toBe(401);

    const expired = await createPersonalToken({ membershipId: t.member.id, name: "Old", days: 30, now: new Date("2027-04-01") });
    expect((await rpc(expired.token, "tools/list")).status).toBe(401);

    const token = await tokenFor(t.member.id);
    expect((await rpc(token, "tools/list")).status).toBe(200);
    await db.membership.update({ where: { id: t.member.id }, data: { removedAt: new Date() } });
    expect((await rpc(token, "tools/list")).status).toBe(401);

    const admin = await tokenFor(t.admin.id);
    await db.personalToken.deleteMany({ where: { membershipId: t.admin.id } });
    expect((await rpc(admin, "tools/list")).status).toBe(401);
  });

  it("stops working when the admins turn assistants off", async () => {
    const t = await makeWorkspace();
    const token = await tokenFor(t.member.id);
    await db.workspaceSettings.update({ where: { workspaceId: t.workspace.id }, data: { assistantAccess: false } });
    expect((await rpc(token, "tools/list")).status).toBe(401);
  });

  it("is stored only as a hash", async () => {
    const t = await makeWorkspace();
    const token = await tokenFor(t.member.id);
    const row = await db.personalToken.findFirstOrThrow({ where: { membershipId: t.member.id } });
    expect(JSON.stringify(row)).not.toContain(token);
  });
});

describe("what an assistant may do", () => {
  it("gives members their own tools and deciders the approval tools too", async () => {
    const t = await makeWorkspace({ approvalsEnabled: true });
    const member = await toolsOf(await tokenFor(t.member.id));
    expect(member).toEqual(["book_time_off", "cancel_time_off", "is_person_off", "my_balance", "my_time_off", "preview_time_off", "who_is_off"]);
    expect(await toolsOf(await tokenFor(t.admin.id))).toEqual([...member, "decide", "pending_approvals"].sort());

    const viewer = await db.membership.create({ data: { workspaceId: t.workspace.id, userId: (await makeUser("Viewer")).id, role: "VIEWER" } });
    expect(await toolsOf(await tokenFor(viewer.id))).toEqual(["is_person_off", "who_is_off"]);
  });

  it("lets a member not decide, even when calling the tool by name", async () => {
    const t = await makeWorkspace({ approvalsEnabled: true });
    const pending = await createBooking({ workspace: t.workspace, settings: t.settings, actor: t.member.actor, membershipId: t.member.id, input: week("2027-07-05", "2027-07-09"), origin });
    const { error } = await call(await tokenFor(t.member.id), "decide", { id: pending.id, decision: "approve" });
    expect(error).toBeTruthy();
    expect((await db.booking.findUniqueOrThrow({ where: { id: pending.id } })).status).toBe("PENDING");
  });

  it("sees only its own workspace", async () => {
    const ours = await makeWorkspace();
    const theirs = await makeWorkspace();
    await bookInApp(theirs, theirs.member, "2027-07-05", "2027-07-09");
    await bookInApp(ours, ours.member, "2027-07-05", "2027-07-06");
    const token = await tokenFor(ours.admin.id);

    const { data } = await call(token, "who_is_off", { from: "2027-07-01", to: "2027-07-31" });
    expect(data.off.map((o: { person: string }) => o.person)).toEqual([ours.member.user.name]);
    expect((await call(token, "is_person_off", { name: theirs.member.user.email, from: "2027-07-01", to: "2027-07-31" })).error).toMatch(/Nobody/);
  });

  it("shows colleagues' time off as away to members, and sick days never as sick, not even to admins", async () => {
    const t = await makeWorkspace();
    await bookInApp(t, t.member, "2027-07-05", "2027-07-06");
    await bookInApp(t, t.admin, "2027-07-07", "2027-07-07", "SICK");
    const range = { from: "2027-07-01", to: "2027-07-31" };

    const asMember = (await call(await tokenFor(t.member.id), "who_is_off", range)).data.off;
    expect(asMember.map((o: { type: string }) => o.type).sort()).toEqual(["away", "vacation"]);

    const asAdmin = (await call(await tokenFor(t.admin.id), "who_is_off", range)).data.off;
    expect(asAdmin.map((o: { type: string }) => o.type).sort()).toEqual(["sick", "vacation"]);
    // The admin's own sick day is theirs to see; a colleague's isn't, through an assistant.
    await bookInApp(t, t.member, "2027-07-12", "2027-07-12", "SICK");
    const later = (await call(await tokenFor(t.admin.id), "who_is_off", { from: "2027-07-12", to: "2027-07-12" })).data.off;
    expect(later[0].type).toBe("other");
  });

  it("cancels only the person's own time off, not a colleague's, even for an admin", async () => {
    const t = await makeWorkspace();
    const theirs = await bookInApp(t, t.member, "2027-07-05", "2027-07-06");
    const mine = await bookInApp(t, t.admin, "2027-07-12", "2027-07-13");
    const token = await tokenFor(t.admin.id);
    expect((await call(token, "cancel_time_off", { booking_id: theirs.id })).error).toBeTruthy();
    expect((await call(token, "cancel_time_off", { booking_id: mine.id })).data).toEqual({ cancelled: mine.id });
    expect((await db.booking.findUniqueOrThrow({ where: { id: theirs.id } })).status).toBe("APPROVED");
  });
});

describe("booking through an assistant", () => {
  it("needs a preview, and books exactly what the app would", async () => {
    const viaAssistant = await makeWorkspace({ approvalsEnabled: true });
    const viaApp = await makeWorkspace({ approvalsEnabled: true });
    const token = await tokenFor(viaAssistant.member.id);

    const preview = await call(token, "preview_time_off", { from: "2027-08-02", to: "2027-08-06" });
    expect(preview.data).toMatchObject({ days_counted: 5, needs_approval: true, over_allowance: false });
    expect(preview.data.allowance[0]).toMatchObject({ year: 2027, days_left_before: 20, days_left_after: 15 });
    expect(await db.booking.count({ where: { workspaceId: viaAssistant.workspace.id } })).toBe(0);

    vi.mocked(sendEmail).mockClear();
    const booked = await call(token, "book_time_off", { confirmation: preview.data.confirmation, note: "Familie" });
    expect(booked.data).toMatchObject({ status: "pending", days: 5 });
    // The admin hears about it like any request.
    expect(vi.mocked(sendEmail).mock.calls.map(([m]) => m.to)).toContain(viaAssistant.admin.user.email);

    const app = await createBooking({
      workspace: viaApp.workspace,
      settings: viaApp.settings,
      actor: viaApp.member.actor,
      membershipId: viaApp.member.id,
      input: { ...week("2027-08-02", "2027-08-06"), note: "Familie" },
      origin,
    });
    const fields = (b: Record<string, unknown>) => {
      const { id, workspaceId, membershipId, createdById, createdAt, updatedAt, pendingSince, ...rest } = b;
      void [id, workspaceId, membershipId, createdById, createdAt, updatedAt, pendingSince];
      return rest;
    };
    const assistantRow = await db.booking.findUniqueOrThrow({ where: { id: booked.data.id } });
    expect(JSON.stringify(fields(assistantRow))).toBe(JSON.stringify(fields(app)));
    expect(assistantRow.createdById).toBe(viaAssistant.member.user.id);

    // The same confirmation can't book twice: it overlaps now.
    expect((await call(token, "book_time_off", { confirmation: preview.data.confirmation })).error).toBeTruthy();
  });

  it("refuses a made-up, changed, expired or someone else's confirmation", async () => {
    const t = await makeWorkspace();
    const token = await tokenFor(t.member.id);
    const span = { start: "2027-08-02", end: "2027-08-06", startPart: "FULL" as const, endPart: "FULL" as const, kind: "vacation" as const };
    const someoneElses = previewToken({ ...span, membershipId: t.admin.id });
    const expired = previewToken({ ...span, membershipId: t.member.id }, new Date("2027-05-31"));
    const valid = previewToken({ ...span, membershipId: t.member.id });
    const [payload, mac] = valid.split(".");
    const changed = `${Buffer.from(Buffer.from(payload, "base64url").toString().replace("2027-08-06", "2027-08-31")).toString("base64url")}.${mac}`;
    for (const confirmation of ["made-up", someoneElses, expired, changed]) {
      expect((await call(token, "book_time_off", { confirmation })).error).toMatch(/Preview again/);
    }
    expect(await db.booking.count({ where: { workspaceId: t.workspace.id } })).toBe(0);
  });

  it("previews with the app's own checks: overlaps, days left and colleagues off", async () => {
    const t = await makeWorkspace();
    await bookInApp(t, t.admin, "2027-08-03", "2027-08-04");
    await bookInApp(t, t.member, "2027-09-06", "2027-09-06");
    const token = await tokenFor(t.member.id);
    expect((await call(token, "preview_time_off", { from: "2027-09-06", to: "2027-09-07" })).error).toMatch(/overlaps/);
    const p = await call(token, "preview_time_off", { from: "2027-08-02", to: "2027-08-06", first_day: "PM" });
    expect(p.data).toMatchObject({ days_counted: 4.5, also_off: [t.admin.user.name], needs_approval: false });
    expect(p.data.allowance[0].days_left_after).toBe(14.5);
    expect((await call(token, "my_balance")).data).toMatchObject({ year: 2027, allowance: 20, taken: 1, left: 19 });
  });
});

describe("approving through an assistant", () => {
  it("lists what's waiting and decides like the app", async () => {
    const t = await makeWorkspace({ approvalsEnabled: true });
    const pending = await createBooking({ workspace: t.workspace, settings: t.settings, actor: t.member.actor, membershipId: t.member.id, input: week("2027-07-05", "2027-07-09"), origin });
    const token = await tokenFor(t.admin.id);
    const waiting = (await call(token, "pending_approvals")).data;
    expect(waiting).toMatchObject([{ id: pending.id, person: t.member.user.name, days: 5, days_left_after: 15 }]);
    expect((await call(token, "decide", { id: pending.id, decision: "approve" })).error).toBeNull();
    expect(await db.booking.findUniqueOrThrow({ where: { id: pending.id } })).toMatchObject({ status: "APPROVED", decidedById: t.admin.user.id });
  });
});

describe("activity log and limits", () => {
  it("logs every call and stops a runaway assistant", async () => {
    const t = await makeWorkspace();
    const token = await tokenFor(t.member.id);
    await call(token, "my_balance");
    const logged = await db.auditEvent.findMany({ where: { workspaceId: t.workspace.id, action: "assistant.call" } });
    expect(logged).toMatchObject([{ actorId: t.member.user.id, detail: "my_balance" }]);

    await db.auditEvent.createMany({
      data: Array.from({ length: CALLS_PER_MINUTE }, () => ({ workspaceId: t.workspace.id, actorId: t.member.user.id, action: "assistant.call", detail: "who_is_off" })),
    });
    expect((await call(token, "my_balance")).error).toMatch(/Too many/);
  });
});

describe("making and revoking tokens", () => {
  const signInAs = (user: { id: string; email: string; name: string | null }) =>
    vi.mocked(auth).mockResolvedValue({ user, expires: "2099-01-01" } as never);
  const form = (fields: Record<string, string>) => {
    const data = new FormData();
    for (const [k, v] of Object.entries(fields)) data.append(k, v);
    return data;
  };

  it("works only for one's own memberships and tokens", async () => {
    const t = await makeWorkspace();
    const outsider = await makeWorkspace();
    signInAs(outsider.admin.user);
    expect(await createAssistantTokenAction({}, form({ name: "Sneaky", days: "30", membershipId: t.member.id }))).toHaveProperty("error");

    signInAs(t.member.user);
    const made = await createAssistantTokenAction({}, form({ name: "Claude", days: "90", membershipId: t.member.id }));
    expect(made.token).toMatch(/^ufl_/);
    expect((await rpc(made.token!, "tools/list")).status).toBe(200);
    const row = await db.personalToken.findFirstOrThrow({ where: { membershipId: t.member.id } });
    expect(row.expiresAt.toISOString()).toBe("2027-08-30T10:00:00.000Z");

    signInAs(outsider.admin.user);
    await revokeAssistantTokenAction(row.id);
    expect(await db.personalToken.count({ where: { id: row.id } })).toBe(1);
    signInAs(t.member.user);
    await revokeAssistantTokenAction(row.id);
    expect((await rpc(made.token!, "tools/list")).status).toBe(401);
  });

  it("isn't offered when the admins turned assistants off", async () => {
    const t = await makeWorkspace();
    await db.workspaceSettings.update({ where: { workspaceId: t.workspace.id }, data: { assistantAccess: false } });
    signInAs(t.member.user);
    expect(await createAssistantTokenAction({}, form({ name: "Claude", days: "30", membershipId: t.member.id }))).toEqual({
      error: "AI assistants are turned off in this workspace.",
    });
  });
});
