import { describe, expect, it, vi } from "vitest";
import { decideByLinkAction } from "@/app/decide/[token]/actions";
import { approveToken } from "@/lib/approve-link";
import { loadApproveLink } from "@/lib/approve-link-db";
import { createBooking, updateBooking } from "@/lib/bookings";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { messagesFor } from "@/lib/i18n";
import { makeUser, makeWorkspace } from "@/test/db";

vi.stubEnv("AUTH_SECRET", process.env.AUTH_SECRET || "db-test-secret-db-test-secret");

const t = messagesFor("en");
const origin = "https://app.test";
const week = { type: "VACATION" as const, note: null, start: "2030-03-04", end: "2030-03-08", startPart: "FULL" as const, endPart: "FULL" as const };

async function requested() {
  const team = await makeWorkspace({ approvalsEnabled: true });
  vi.mocked(sendEmail).mockClear();
  const booking = await createBooking({
    workspace: team.workspace,
    settings: team.settings,
    actor: team.member.actor,
    membershipId: team.member.id,
    input: week,
    origin,
  });
  return { team, booking };
}

function form(decision: "approve" | "reject", note = "") {
  const data = new FormData();
  data.set("decision", decision);
  data.set("note", note);
  return data;
}

/** The approve link from the request email that went to this address. */
function linkIn(to: string, which: "Approve" | "Decline") {
  const call = vi.mocked(sendEmail).mock.calls.find(([mail]) => mail.to === to);
  const match = call?.[0].text.match(new RegExp(`${which}: ${origin}/decide/([^?\\s]+)\\?d=`));
  return match?.[1];
}

describe("approve and decline links in the request email", () => {
  it("sends each admin their own links, and the link decides once through the normal path", async () => {
    const { team, booking } = await requested();
    const second = await makeUser("Second admin");
    await db.membership.create({ data: { workspaceId: team.workspace.id, userId: second.id, role: "ADMIN" } });
    vi.mocked(sendEmail).mockClear();
    // A change sends the request again, now to both admins.
    await updateBooking({
      workspace: team.workspace,
      settings: team.settings,
      actor: team.member.actor,
      bookingId: booking.id,
      input: { ...week, end: "2030-03-07" },
      origin,
    });
    const first = linkIn(team.admin.user.email, "Approve");
    const other = linkIn(second.email, "Approve");
    expect(first).toBeTruthy();
    expect(other).toBeTruthy();
    expect(first).not.toBe(other);

    vi.mocked(sendEmail).mockClear();
    expect(await decideByLinkAction(first!, {}, form("approve"))).toEqual({});
    const saved = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(saved).toMatchObject({ status: "APPROVED", decidedById: team.admin.userId });
    // The person hears about it, and the activity log names the admin, as on the Approvals page.
    expect(vi.mocked(sendEmail).mock.calls.map(([mail]) => mail.to)).toEqual([team.member.user.email]);
    expect(await db.auditEvent.count({ where: { workspaceId: team.workspace.id, action: "booking.approved", actorId: team.admin.userId } })).toBe(1);

    // The other admin's link now finds nothing pending.
    expect(await decideByLinkAction(other!, {}, form("reject"))).toEqual({ error: t.errors.alreadyHandled });
  });

  it("declines with a note that goes into the email only", async () => {
    const { team, booking } = await requested();
    const token = linkIn(team.admin.user.email, "Decline")!;
    vi.mocked(sendEmail).mockClear();
    await decideByLinkAction(token, {}, form("reject", "Busy week, sorry"));
    expect(await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).toMatchObject({ status: "REJECTED", decisionNote: null });
    expect(vi.mocked(sendEmail).mock.calls[0][0].text).toContain("Busy week, sorry");
  });

  it("stops working when the admin is removed or no longer an admin", async () => {
    const { team, booking } = await requested();
    const token = approveToken({ bookingId: booking.id, membershipId: team.admin.id });

    await db.membership.update({ where: { id: team.admin.id }, data: { role: "MEMBER" } });
    expect((await loadApproveLink(token)).status).toBe("notAdmin");
    expect(await decideByLinkAction(token, {}, form("approve"))).toEqual({ error: t.approvals.link.notAdmin });

    await db.membership.update({ where: { id: team.admin.id }, data: { role: "ADMIN", removedAt: new Date() } });
    expect(await decideByLinkAction(token, {}, form("approve"))).toEqual({ error: t.approvals.link.broken });
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("PENDING");
  });

  it("can't decide on another workspace's booking", async () => {
    const { booking } = await requested();
    const other = await makeWorkspace({ approvalsEnabled: true });
    const token = approveToken({ bookingId: booking.id, membershipId: other.admin.id });
    expect(await decideByLinkAction(token, {}, form("approve"))).toEqual({ error: t.errors.alreadyHandled });
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("PENDING");
  });

  it("refuses a link for a deleted workspace or a forged token", async () => {
    const { team, booking } = await requested();
    const token = approveToken({ bookingId: booking.id, membershipId: team.admin.id });
    expect(await decideByLinkAction(`${token}x`, {}, form("approve"))).toEqual({ error: t.approvals.link.broken });
    await db.workspace.update({ where: { id: team.workspace.id }, data: { deletedAt: new Date() } });
    expect(await decideByLinkAction(token, {}, form("approve"))).toEqual({ error: t.approvals.link.broken });
  });
});
