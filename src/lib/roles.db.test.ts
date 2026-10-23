import { describe, expect, it, vi } from "vitest";
import type { Role } from "@/generated/prisma/enums";
import { cancelBooking, createBooking, decideBooking, forViewer } from "@/lib/bookings";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { messagesFor } from "@/lib/i18n";
import { makeUser, makeWorkspace } from "@/test/db";

const errors = messagesFor("en").errors;
const origin = "https://app.test";
const week = { type: "VACATION" as const, note: null, start: "2030-03-04", end: "2030-03-08", startPart: "FULL" as const, endPart: "FULL" as const };

/** A workspace with approvals on, plus one person with the given role. */
async function teamWith(role: Role) {
  const team = await makeWorkspace({ approvalsEnabled: true });
  const user = await makeUser(role);
  const m = await db.membership.create({ data: { workspaceId: team.workspace.id, userId: user.id, role, annualAllowanceDays: 20 } });
  return { ...team, other: { ...m, user, actor: { userId: user.id, membershipId: m.id, role } } };
}

type Team = Awaited<ReturnType<typeof teamWith>>;
const book = (team: Team, actor: Team["other"]["actor"], membershipId: string, input: typeof week | (Omit<typeof week, "type"> & { type: "SICK" }) = week) =>
  createBooking({ workspace: team.workspace, settings: team.settings, actor, membershipId, input, origin });
const decide = (team: Team, actor: Team["other"]["actor"], bookingId: string) =>
  decideBooking({ workspace: team.workspace, settings: team.settings, actor, bookingId, approve: true, note: null, origin });

describe("approvers", () => {
  it("decide a member's request, which is emailed to them as well as the admin", async () => {
    const team = await teamWith("APPROVER");
    vi.mocked(sendEmail).mockClear();
    const request = await book(team, team.member.actor, team.member.id);
    expect(request.status).toBe("PENDING");
    const to = vi.mocked(sendEmail).mock.calls.map(([m]) => m.to);
    expect(to).toEqual(expect.arrayContaining([team.admin.user.email, team.other.user.email]));

    await decide(team, team.other.actor, request.id);
    expect((await db.booking.findUniqueOrThrow({ where: { id: request.id } })).status).toBe("APPROVED");
  });

  it("book for others without approval, but their own time off waits for someone else", async () => {
    const team = await teamWith("APPROVER");
    expect((await book(team, team.other.actor, team.member.id)).status).toBe("APPROVED");

    vi.mocked(sendEmail).mockClear();
    const own = await book(team, team.other.actor, team.other.id, { ...week, start: "2030-04-01", end: "2030-04-05" });
    expect(own.status).toBe("PENDING");
    // The request goes to the admin, not back to the approver who asked.
    expect(vi.mocked(sendEmail).mock.calls.map(([m]) => m.to)).toEqual([team.admin.user.email]);
    await expect(decide(team, team.other.actor, own.id)).rejects.toThrow(errors.notOwnRequest);
    await decide(team, team.admin.actor, own.id);
  });

  it("don't see or enter colleagues' sick days", async () => {
    const team = await teamWith("APPROVER");
    const sick = { ...week, type: "SICK" as const };
    await expect(book(team, team.other.actor, team.member.id, sick)).rejects.toThrow(errors.onlyAdminsSickForOthers);
    const entered = await book(team, team.admin.actor, team.member.id, sick);
    const seen = forViewer([entered], { membershipId: team.other.id, role: "APPROVER" });
    expect(seen[0].type).toBe("OTHER");
    await expect(cancelBooking({ workspaceId: team.workspace.id, actor: team.other.actor, bookingId: entered.id })).rejects.toThrow(
      errors.onlyAdminsSickForOthers,
    );
  });
});

describe("viewers", () => {
  it("can't book, for themselves or anyone else, and can't decide", async () => {
    const team = await teamWith("VIEWER");
    await expect(book(team, team.other.actor, team.other.id)).rejects.toThrow(errors.viewerCantBook);
    await expect(book(team, team.other.actor, team.member.id)).rejects.toThrow(errors.onlyAdminsBookForOthers);
    const request = await book(team, team.member.actor, team.member.id);
    await expect(decide(team, team.other.actor, request.id)).rejects.toThrow(errors.onlyAdminsApprove);
  });

  it("aren't asked to approve", async () => {
    const team = await teamWith("VIEWER");
    vi.mocked(sendEmail).mockClear();
    await book(team, team.member.actor, team.member.id);
    expect(vi.mocked(sendEmail).mock.calls.map(([m]) => m.to)).toEqual([team.admin.user.email]);
  });
});
