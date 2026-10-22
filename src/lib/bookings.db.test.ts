import { describe, expect, it, vi } from "vitest";
import type { BookingType } from "@/generated/prisma/enums";
import type { BookingSpan } from "@/lib/booking-days";
import { allowanceSummary, cancelBooking, createBooking, decideBooking, restoreBooking, updateBooking } from "@/lib/bookings";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { messagesFor } from "@/lib/i18n";
import { growTo, makeWorkspace } from "@/test/db";

const errors = messagesFor("en").errors;
const origin = "https://app.test";

/** Mon 4 – Fri 8 March 2030: five working days. */
const week: BookingSpan & { type: BookingType; note: null } = {
  type: "VACATION",
  note: null,
  start: "2030-03-04",
  end: "2030-03-08",
  startPart: "FULL",
  endPart: "FULL",
};

type Team = Awaited<ReturnType<typeof makeWorkspace>>;

function book(team: Team, by: Team["admin"] | Team["member"], forWhom: { id: string }, input = week) {
  return createBooking({ workspace: team.workspace, settings: team.settings, actor: by.actor, membershipId: forWhom.id, input, origin });
}

describe("who may book", () => {
  it("lets a member book for themselves but not for a colleague", async () => {
    const team = await makeWorkspace();
    const own = await book(team, team.member, team.member);
    expect(Number(own.daysCount)).toBe(5);
    await expect(book(team, team.member, team.admin)).rejects.toThrow(errors.onlyAdminsBookForOthers);
  });

  it("lets an admin book for anyone, and a member can't change or cancel it", async () => {
    const team = await makeWorkspace();
    const booking = await book(team, team.admin, team.member);
    const other = await book(team, team.admin, team.admin);
    await expect(
      updateBooking({ workspace: team.workspace, settings: team.settings, actor: team.member.actor, bookingId: other.id, input: week, origin }),
    ).rejects.toThrow(errors.onlyOwnChange);
    await expect(cancelBooking({ workspaceId: team.workspace.id, actor: team.member.actor, bookingId: other.id })).rejects.toThrow(
      errors.onlyOwnCancel,
    );
    expect(booking.status).toBe("APPROVED");
  });

  it("doesn't let anyone reach a booking in another workspace", async () => {
    const [team, stranger] = await Promise.all([makeWorkspace(), makeWorkspace()]);
    const booking = await book(team, team.member, team.member);
    await expect(cancelBooking({ workspaceId: stranger.workspace.id, actor: stranger.admin.actor, bookingId: booking.id })).rejects.toThrow(
      errors.bookingNotFound,
    );
    await expect(book(stranger, stranger.admin, team.member)).rejects.toThrow(errors.memberNotInWorkspace);
  });
});

describe("approvals", () => {
  it("makes a member's booking pending and an admin's approved", async () => {
    const team = await makeWorkspace({ approvalsEnabled: true });
    expect((await book(team, team.member, team.member)).status).toBe("PENDING");
    expect((await book(team, team.admin, team.admin)).status).toBe("APPROVED");
  });

  it("sends a member's changed dates back for approval", async () => {
    const team = await makeWorkspace({ approvalsEnabled: true });
    const booking = await book(team, team.admin, team.member);
    const changed = await updateBooking({
      workspace: team.workspace,
      settings: team.settings,
      actor: team.member.actor,
      bookingId: booking.id,
      input: { ...week, end: "2030-03-06" },
      origin,
    });
    expect(changed.status).toBe("PENDING");
    expect(Number(changed.daysCount)).toBe(3);
  });

  it("decides once when two admins answer at the same moment", async () => {
    const team = await makeWorkspace({ approvalsEnabled: true });
    const booking = await book(team, team.member, team.member);
    vi.mocked(sendEmail).mockClear();
    const decide = (approve: boolean) =>
      decideBooking({ workspace: team.workspace, settings: team.settings, actor: team.admin.actor, bookingId: booking.id, approve, note: null, origin });

    const results = await Promise.allSettled([decide(true), decide(false)]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({ reason: { message: errors.alreadyHandled } });
    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1);
    expect(await db.auditEvent.count({ where: { workspaceId: team.workspace.id, action: { in: ["booking.approved", "booking.declined"] } } })).toBe(1);
  });

  it("doesn't let a member decide", async () => {
    const team = await makeWorkspace({ approvalsEnabled: true });
    const booking = await book(team, team.member, team.member);
    await expect(
      decideBooking({ workspace: team.workspace, settings: team.settings, actor: team.member.actor, bookingId: booking.id, approve: true, note: null, origin }),
    ).rejects.toThrow(errors.onlyAdminsApprove);
  });
});

describe("overlaps and the plan limit", () => {
  it("refuses a second booking on the same days with a readable message", async () => {
    const team = await makeWorkspace();
    await book(team, team.member, team.member);
    await expect(book(team, team.member, team.member, { ...week, start: "2030-03-08", end: "2030-03-11" })).rejects.toThrow(errors.overlap);
  });

  it("allows a morning and an afternoon on the same day", async () => {
    const team = await makeWorkspace();
    await book(team, team.member, team.member, { ...week, start: "2030-03-04", end: "2030-03-04", endPart: "AM" });
    const afternoon = await book(team, team.member, team.member, { ...week, start: "2030-03-04", end: "2030-03-04", startPart: "PM" });
    expect(Number(afternoon.daysCount)).toBe(0.5);
  });

  it("stops new bookings over the plan limit but still lets people cancel", async () => {
    const team = await makeWorkspace();
    const booking = await book(team, team.member, team.member);
    await db.workspace.update({ where: { id: team.workspace.id }, data: { plan: "FREE", billingStatus: null } });
    await growTo(team.workspace.id, 6);
    await expect(book(team, team.member, team.member, { ...week, start: "2030-06-03", end: "2030-06-03" })).rejects.toThrow(
      errors.overLimit("Free", 5, 6),
    );
    await cancelBooking({ workspaceId: team.workspace.id, actor: team.member.actor, bookingId: booking.id });
  });

  it("gives a team in its trial the Business limit", async () => {
    const team = await makeWorkspace({ plan: "FREE", billingStatus: null, trialEndsAt: new Date(Date.now() + 10 * 86_400_000) });
    await growTo(team.workspace.id, 6);
    await expect(book(team, team.member, team.member)).resolves.toMatchObject({ status: "APPROVED" });
  });
});

describe("cancel and restore", () => {
  it("puts a cancelled booking back as it was, once", async () => {
    const team = await makeWorkspace({ approvalsEnabled: true });
    const booking = await book(team, team.admin, team.member);
    const cancel = () => cancelBooking({ workspaceId: team.workspace.id, actor: team.member.actor, bookingId: booking.id });
    const restore = () => restoreBooking({ workspace: team.workspace, settings: team.settings, actor: team.member.actor, bookingId: booking.id });

    await cancel();
    await expect(cancel()).rejects.toThrow(errors.bookingNotFound);
    await restore();
    // Approved by the admin before, so it comes back approved, not pending.
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("APPROVED");
    await expect(restore()).rejects.toThrow(errors.bookingNotFound);
  });

  it("refuses a restore after the undo window", async () => {
    const team = await makeWorkspace();
    const booking = await book(team, team.member, team.member);
    await cancelBooking({ workspaceId: team.workspace.id, actor: team.member.actor, bookingId: booking.id });
    await db.booking.update({ where: { id: booking.id }, data: { cancelledAt: new Date(Date.now() - 31 * 86_400_000) } });
    await expect(
      restoreBooking({ workspace: team.workspace, settings: team.settings, actor: team.member.actor, bookingId: booking.id }),
    ).rejects.toThrow(errors.restoreExpired);
  });
});

describe("allowanceSummary", () => {
  const summary = (team: Team, today: string, membership = team.member) =>
    allowanceSummary(membership, team.settings, 2030, new Set(), today);

  it("counts approved and pending vacation, not other leave", async () => {
    const team = await makeWorkspace({ approvalsEnabled: true });
    await book(team, team.admin, team.member);
    await book(team, team.member, team.member, { ...week, start: "2030-06-03", end: "2030-06-04" });
    await book(team, team.admin, team.member, { ...week, type: "OTHER", start: "2030-04-01", end: "2030-04-01" });
    expect(await summary(team, "2030-01-15")).toMatchObject({ allowance: 20, used: 5, pending: 2, remaining: 13 });
  });

  it("carries unused days over, uses them first, and lets the rest expire after the deadline", async () => {
    const team = await makeWorkspace({ maxCarryOverDays: 5, carryOverExpiry: "03-31" });
    // 2029: 17 of 20 taken, so 3 carry over.
    await book(team, team.member, team.member, { ...week, start: "2029-01-01", end: "2029-01-23" });
    // 2030: 2 days before the deadline.
    await book(team, team.member, team.member, { ...week, start: "2030-03-04", end: "2030-03-05" });

    expect(await summary(team, "2030-03-01")).toMatchObject({ carriedOver: 3, carryOverLeft: 1, carryOverExpired: 0, allowance: 23, remaining: 21 });
    expect(await summary(team, "2030-04-01")).toMatchObject({ carriedOver: 3, carryOverLeft: 0, carryOverExpired: 1, allowance: 22, remaining: 20 });
  });

  it("keeps carried-over days past the deadline for a person exempted after a long illness", async () => {
    const team = await makeWorkspace({ maxCarryOverDays: 5, carryOverExpiry: "03-31" });
    await db.keepCarriedOver.create({ data: { membershipId: team.member.id, year: 2030 } });
    expect(await summary(team, "2030-06-01")).toMatchObject({ carriedOver: 5, carryOverExpiresOn: null, carryOverExpired: 0, allowance: 25 });
    // Only this person: the admin's days still expire.
    expect(await summary(team, "2030-06-01", team.admin)).toMatchObject({ carryOverExpired: 5, allowance: 20 });
  });

  it("caps carry-over at the workspace maximum", async () => {
    const team = await makeWorkspace({ maxCarryOverDays: 5 });
    expect(await summary(team, "2030-01-15")).toMatchObject({ carriedOver: 5, allowance: 25 });
  });

  it("uses the left-over days an admin entered instead of calculating them, and they still expire", async () => {
    // Moved over from Excel: no 2029 bookings in the app, but 8 days still open (more than the cap of 5).
    const team = await makeWorkspace({ maxCarryOverDays: 5, carryOverExpiry: "03-31" });
    await db.carriedOver.create({ data: { membershipId: team.member.id, year: 2030, days: 8 } });
    await book(team, team.member, team.member, { ...week, start: "2030-03-04", end: "2030-03-05" });

    expect(await summary(team, "2030-03-01")).toMatchObject({ carriedOver: 8, carriedOverEntered: true, carryOverLeft: 6, allowance: 28 });
    expect(await summary(team, "2030-04-01")).toMatchObject({ carriedOver: 8, carryOverExpired: 6, allowance: 22, remaining: 20 });
  });

  it("counts entered left-over days even when the workspace doesn't carry days over", async () => {
    const team = await makeWorkspace();
    await db.carriedOver.create({ data: { membershipId: team.member.id, year: 2030, days: 2.5 } });
    expect(await summary(team, "2030-06-01")).toMatchObject({ carriedOver: 2.5, allowance: 22.5 });
  });

  it("carries nothing over from before someone started, and pro-rates their first year", async () => {
    const team = await makeWorkspace({ maxCarryOverDays: 5 });
    const starter = await db.membership.update({ where: { id: team.member.id }, data: { employmentStart: new Date("2030-07-01") } });
    // Six full months in 2030: half of 20.
    expect(await allowanceSummary(starter, team.settings, 2030, new Set(), "2030-07-01")).toMatchObject({ carriedOver: 0, allowance: 10 });
  });
});
