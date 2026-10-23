import { describe, expect, it, vi } from "vitest";
import { approvalsInUse, cancelBooking, createBooking, restoreBooking, updateBooking } from "@/lib/bookings";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { messagesFor } from "@/lib/i18n";
import { makeWorkspace } from "@/test/db";

const errors = messagesFor("en").errors;
const origin = "https://app.test";
const span = (start: string, end: string) => ({ type: "VACATION" as const, note: null, start, end, startPart: "FULL" as const, endPart: "FULL" as const });
// 20 working days: the member's whole allowance for 2030.
const fourWeeks = span("2030-03-04", "2030-03-29");
const oneMore = span("2030-04-01", "2030-04-01");

async function team(overAllowance: "WARN" | "APPROVAL" | "BLOCK", approvalsEnabled = false) {
  const t = await makeWorkspace({ approvalsEnabled });
  await db.workspaceSettings.update({ where: { workspaceId: t.workspace.id }, data: { overAllowance } });
  return { ...t, settings: { ...t.settings, overAllowance } };
}
type Team = Awaited<ReturnType<typeof team>>;
const book = (t: Team, input: ReturnType<typeof span>, actor: Team["admin"]["actor"] | Team["member"]["actor"] = t.member.actor) =>
  createBooking({ workspace: t.workspace, settings: t.settings, actor, membershipId: t.member.id, input, origin });

describe("booking more than is left", () => {
  it("is allowed with a warning by default", async () => {
    const t = await team("WARN");
    await book(t, fourWeeks);
    expect((await book(t, oneMore)).status).toBe("APPROVED");
  });

  it("can be blocked, though not for admins", async () => {
    const t = await team("BLOCK");
    await book(t, fourWeeks);
    await expect(book(t, oneMore)).rejects.toThrow(errors.overAllowanceBlocked("1"));
    expect((await book(t, oneMore, t.admin.actor)).status).toBe("APPROVED");
  });

  it("can need approval even with approvals off, and then reaches the admins", async () => {
    const t = await team("APPROVAL");
    expect(approvalsInUse(t.settings)).toBe(true);
    expect((await book(t, fourWeeks)).status).toBe("APPROVED");
    vi.mocked(sendEmail).mockClear();
    expect((await book(t, oneMore)).status).toBe("PENDING");
    expect(vi.mocked(sendEmail).mock.calls.map(([m]) => m.to)).toContain(t.admin.user.email);
  });

  it("gives a changed booking's own days back before checking", async () => {
    const t = await team("BLOCK");
    const almost = await book(t, span("2030-03-04", "2030-03-27"));
    const change = (input: ReturnType<typeof span>) =>
      updateBooking({ workspace: t.workspace, settings: t.settings, actor: t.member.actor, bookingId: almost.id, input, origin });
    await change(fourWeeks);
    await expect(change(span("2030-03-04", "2030-04-01"))).rejects.toThrow(errors.overAllowanceBlocked("1"));
  });
});

describe("time off that has ended", () => {
  // "Today" is 2027-06-01 in tests.
  const past = span("2027-05-03", "2027-05-05");

  it("can't be changed, cancelled or restored by the person", async () => {
    const t = await team("WARN");
    const booking = await book(t, past);
    const actor = t.member.actor;
    await expect(
      updateBooking({ workspace: t.workspace, settings: t.settings, actor, bookingId: booking.id, input: span("2027-05-03", "2027-05-04"), origin }),
    ).rejects.toThrow(errors.pastLocked);
    await expect(cancelBooking({ workspaceId: t.workspace.id, actor, bookingId: booking.id })).rejects.toThrow(errors.pastLocked);

    await cancelBooking({ workspaceId: t.workspace.id, actor: t.admin.actor, bookingId: booking.id });
    await expect(restoreBooking({ workspace: t.workspace, settings: t.settings, actor, bookingId: booking.id })).rejects.toThrow(errors.pastLocked);
  });

  it("can be changed by an admin, which shows in Activity", async () => {
    const t = await team("WARN");
    const booking = await book(t, past);
    await updateBooking({ workspace: t.workspace, settings: t.settings, actor: t.admin.actor, bookingId: booking.id, input: span("2027-05-03", "2027-05-04"), origin });
    const audit = await db.auditEvent.findFirst({ where: { workspaceId: t.workspace.id, action: "booking.past_changed" } });
    expect(audit?.actorId).toBe(t.admin.userId);
  });
});
