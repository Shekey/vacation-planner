import { describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { updateLeaveTypeAction } from "@/app/w/[slug]/leave-types/actions";
import { allowanceSummary, createBooking, leaveTypeUsage, updateBooking } from "@/lib/bookings";
import { db } from "@/lib/db";
import { messagesFor } from "@/lib/i18n";
import { makeWorkspace } from "@/test/db";

vi.mock("@/auth", () => ({ auth: vi.fn(async () => null), signIn: vi.fn(), signOut: vi.fn() }));

const errors = messagesFor("en").errors;
const origin = "https://app.test";
// Monday to Wednesday: 3 working days.
const days3 = { type: "OTHER" as const, note: null, start: "2030-03-04", end: "2030-03-06", startPart: "FULL" as const, endPart: "FULL" as const };

type Team = Awaited<ReturnType<typeof makeWorkspace>>;
const leaveType = (team: Team, data: { countsAsVacation?: boolean; allowanceDays?: number; needsApproval?: boolean; archivedAt?: Date } = {}) =>
  db.leaveType.create({ data: { workspaceId: team.workspace.id, name: "Fortbildung", color: "teal", ...data } });
const book = (team: Team, leaveTypeId: string, input: Partial<typeof days3> = {}) =>
  createBooking({
    workspace: team.workspace,
    settings: team.settings,
    actor: team.member.actor,
    membershipId: team.member.id,
    input: { ...days3, ...input, leaveTypeId },
    origin,
  });

describe("own leave types", () => {
  it("that count as vacation are stored as vacation and use up the allowance", async () => {
    const team = await makeWorkspace();
    const lieu = await leaveType(team, { countsAsVacation: true });
    const booking = await book(team, lieu.id);
    expect(booking).toMatchObject({ type: "VACATION", leaveTypeId: lieu.id });
    expect((await allowanceSummary(team.member, team.settings, 2030)).used).toBe(3);
  });

  it("with their own allowance don't touch the vacation allowance and are counted per type", async () => {
    const team = await makeWorkspace();
    const training = await leaveType(team, { allowanceDays: 5 });
    const booking = await book(team, training.id);
    expect(booking).toMatchObject({ type: "OTHER", leaveTypeId: training.id });
    expect((await allowanceSummary(team.member, team.settings, 2030)).used).toBe(0);
    expect(await leaveTypeUsage(team.workspace.id, 2030)).toEqual({ [team.member.id]: { [training.id]: 3 } });
  });

  it("can skip approval even when approvals are on", async () => {
    const team = await makeWorkspace({ approvalsEnabled: true });
    expect((await book(team, (await leaveType(team, { needsApproval: false })).id)).status).toBe("APPROVED");
    expect((await book(team, (await leaveType(team)).id, { start: "2030-04-01", end: "2030-04-01" })).status).toBe("PENDING");
  });

  it("can't be taken from another workspace or picked once removed, but stay on bookings that have them", async () => {
    const team = await makeWorkspace();
    const other = await makeWorkspace();
    await expect(book(team, (await leaveType(other)).id)).rejects.toThrow(errors.leaveTypeGone);

    const old = await leaveType(team);
    const booking = await book(team, old.id);
    await db.leaveType.update({ where: { id: old.id }, data: { archivedAt: new Date() } });
    await expect(book(team, old.id, { start: "2030-05-06", end: "2030-05-06" })).rejects.toThrow(errors.leaveTypeGone);

    const moved = await updateBooking({
      workspace: team.workspace,
      settings: team.settings,
      actor: team.member.actor,
      bookingId: booking.id,
      input: { ...days3, start: "2030-03-11", end: "2030-03-12", leaveTypeId: old.id },
      origin,
    });
    expect(moved.leaveTypeId).toBe(old.id);
  });

  it("move their bookings in or out of the vacation allowance when that setting changes", async () => {
    const team = await makeWorkspace();
    const training = await leaveType(team);
    const booking = await book(team, training.id);
    vi.mocked(auth).mockResolvedValue({ user: { id: team.admin.userId, email: team.admin.user.email, name: null }, expires: "2099-01-01" } as never);

    const result = await updateLeaveTypeAction(team.workspace.slug, training.id, {}, formOf({ name: "Fortbildung", color: "teal", countsAsVacation: "on" }));
    expect(result).toEqual({ ok: messagesFor("en").leaveTypes.saved });
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).type).toBe("VACATION");
    // An own allowance is dropped: the days would otherwise count twice.
    expect((await db.leaveType.findUniqueOrThrow({ where: { id: training.id } })).allowanceDays).toBeNull();
  });
});

function formOf(fields: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.append(k, v);
  return data;
}
