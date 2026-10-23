import { describe, expect, it, vi } from "vitest";
import { availableDeciders, createBooking } from "@/lib/bookings";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { handlePendingRequests, pendingStep, waitingDays } from "@/lib/pending-reminders";
import { makeUser, makeWorkspace } from "@/test/db";

const origin = "https://app.test";
const DAY = 86_400_000;
const week = { type: "VACATION" as const, note: null, start: "2030-03-04", end: "2030-03-08", startPart: "FULL" as const, endPart: "FULL" as const };
const later = (days: number) => new Date(Date.now() + days * DAY);

describe("pendingStep", () => {
  const made = new Date("2027-06-01T10:00:00Z");
  const fresh = { pendingSince: made, createdAt: made, remindedAt: null };
  const at = (days: number) => new Date(made.getTime() + days * DAY);

  it("counts whole days, from pendingSince or else from when the request was made", () => {
    expect(waitingDays(fresh, at(2.9))).toBe(2);
    expect(waitingDays({ pendingSince: null, createdAt: at(-4) }, made)).toBe(4);
    // A changed request starts over.
    expect(waitingDays({ pendingSince: at(3), createdAt: made }, at(4))).toBe(1);
  });

  it("reminds once after the reminder days and approves after the auto-approve days", () => {
    const settings = { reminderDays: 3, autoApproveDays: 7 };
    expect(pendingStep(fresh, settings, at(2))).toBeNull();
    expect(pendingStep(fresh, settings, at(3))).toBe("remind");
    expect(pendingStep({ ...fresh, remindedAt: at(3) }, settings, at(5))).toBeNull();
    expect(pendingStep({ ...fresh, remindedAt: at(3) }, settings, at(7))).toBe("autoApprove");
  });

  it("does nothing when both are off", () => {
    expect(pendingStep(fresh, { reminderDays: null, autoApproveDays: null }, at(100))).toBeNull();
  });
});

describe("availableDeciders", () => {
  it("leaves out whoever is away until today or later, unless everyone is", () => {
    const back = { id: "a", awayUntil: new Date("2027-05-31") };
    const away = { id: "b", awayUntil: new Date("2027-06-01") };
    const here = { id: "c", awayUntil: null };
    expect(availableDeciders([back, away, here], "2027-06-01").map((d) => d.id)).toEqual(["a", "c"]);
    expect(availableDeciders([away], "2027-06-01").map((d) => d.id)).toEqual(["b"]);
  });
});

/** A workspace with approvals on and the given reminder settings, a pending request from the member, and an approver. */
async function waitingRequest(settings: { reminderDays?: number | null; autoApproveDays?: number | null } = {}) {
  const team = await makeWorkspace({ approvalsEnabled: true });
  await db.workspaceSettings.update({ where: { workspaceId: team.workspace.id }, data: settings });
  const approverUser = await makeUser("Approver");
  const approver = await db.membership.create({
    data: { workspaceId: team.workspace.id, userId: approverUser.id, role: "APPROVER", annualAllowanceDays: 20 },
  });
  return { ...team, approver: { ...approver, user: approverUser } };
}

const request = (team: Awaited<ReturnType<typeof waitingRequest>>) =>
  createBooking({
    workspace: team.workspace,
    settings: team.settings,
    actor: team.member.actor,
    membershipId: team.member.id,
    input: week,
    origin,
  });

const mailsTo = (email: string) => vi.mocked(sendEmail).mock.calls.map(([m]) => m).filter((m) => m.to === email);

describe("handlePendingRequests", () => {
  it("reminds the deciders once, with one-click links, and tells the person who was reminded", async () => {
    const team = await waitingRequest({ reminderDays: 3 });
    const booking = await request(team);

    vi.mocked(sendEmail).mockClear();
    await handlePendingRequests(origin, later(2));
    expect(mailsTo(team.admin.user.email)).toEqual([]);

    await handlePendingRequests(origin, later(3));
    const [reminder] = mailsTo(team.admin.user.email);
    expect(reminder.subject).toContain("3 days");
    expect(reminder.text).toContain(`${origin}/decide/`);
    expect(mailsTo(team.approver.user.email)).toHaveLength(1);
    const [toPerson] = mailsTo(team.member.user.email);
    expect(toPerson.text).toContain("Approver");
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).remindedAt).not.toBeNull();

    vi.mocked(sendEmail).mockClear();
    await handlePendingRequests(origin, later(4));
    expect(mailsTo(team.admin.user.email)).toEqual([]);
    expect(mailsTo(team.member.user.email)).toEqual([]);
  });

  it("skips deciders who are away, for new requests and for reminders", async () => {
    const team = await waitingRequest({ reminderDays: 3 });
    await db.membership.update({ where: { id: team.admin.id }, data: { awayUntil: new Date("2027-06-30") } });

    vi.mocked(sendEmail).mockClear();
    await request(team);
    expect(mailsTo(team.admin.user.email)).toEqual([]);
    expect(mailsTo(team.approver.user.email)).toHaveLength(1);

    vi.mocked(sendEmail).mockClear();
    await handlePendingRequests(origin, later(3));
    expect(mailsTo(team.admin.user.email)).toEqual([]);
    expect(mailsTo(team.approver.user.email)).toHaveLength(1);
  });

  it("still reaches someone when every decider is away", async () => {
    const team = await waitingRequest({ reminderDays: 3 });
    await db.membership.updateMany({ where: { workspaceId: team.workspace.id, role: { in: ["ADMIN", "APPROVER"] } }, data: { awayUntil: new Date("2027-06-30") } });
    vi.mocked(sendEmail).mockClear();
    await request(team);
    expect(mailsTo(team.admin.user.email)).toHaveLength(1);
    expect(mailsTo(team.approver.user.email)).toHaveLength(1);
  });

  it("approves automatically after the auto-approve days, logs it and tells the person", async () => {
    const team = await waitingRequest({ reminderDays: null, autoApproveDays: 5 });
    const booking = await request(team);

    await handlePendingRequests(origin, later(4));
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("PENDING");

    vi.mocked(sendEmail).mockClear();
    await handlePendingRequests(origin, later(5));
    const saved = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(saved.status).toBe("APPROVED");
    expect(saved.decidedById).toBeNull();
    const audit = await db.auditEvent.findFirst({ where: { workspaceId: team.workspace.id, action: "booking.auto_approved" } });
    expect(audit?.actorId).toBeNull();
    const [toPerson] = mailsTo(team.member.user.email);
    expect(toPerson.text).toContain("5 days");
  });

  it("leaves workspaces with approvals off alone", async () => {
    const team = await waitingRequest({ reminderDays: 3, autoApproveDays: 5 });
    const booking = await request(team);
    await db.workspaceSettings.update({ where: { workspaceId: team.workspace.id }, data: { approvalsEnabled: false } });
    vi.mocked(sendEmail).mockClear();
    await handlePendingRequests(origin, later(10));
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("PENDING");
    expect(mailsTo(team.admin.user.email)).toEqual([]);
  });
});
