import { describe, expect, it, vi } from "vitest";
import { createBooking, decideBooking, updateBooking } from "@/lib/bookings";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { messagesFor } from "@/lib/i18n";
import { makeUser, makeWorkspace } from "@/test/db";

const errors = messagesFor("en").errors;
const origin = "https://app.test";
const week = { type: "VACATION" as const, note: null, start: "2030-03-04", end: "2030-03-08", startPart: "FULL" as const, endPart: "FULL" as const };

/** A workspace plus a colleague, Ben, who can stand in for the member. */
async function team(opts: { approvalsEnabled?: boolean } = {}) {
  const t = await makeWorkspace(opts);
  const user = await makeUser("Ben");
  const ben = await db.membership.create({ data: { workspaceId: t.workspace.id, userId: user.id, annualAllowanceDays: 20 } });
  return { ...t, ben: { ...ben, user } };
}
type Team = Awaited<ReturnType<typeof team>>;

const book = (t: Team, input: Partial<Omit<typeof week, "type">> & { standInId?: string | null; type?: "VACATION" | "SICK" } = {}) =>
  createBooking({ workspace: t.workspace, settings: t.settings, actor: t.member.actor, membershipId: t.member.id, input: { ...week, ...input }, origin });
const mailsTo = (email: string) => vi.mocked(sendEmail).mock.calls.map(([m]) => m).filter((m) => m.to === email);

describe("stand-in", () => {
  it("is saved and emailed once the time off is booked", async () => {
    const t = await team();
    vi.mocked(sendEmail).mockClear();
    const booking = await book(t, { standInId: t.ben.id });
    expect(booking.standInId).toBe(t.ben.id);
    const [mail] = mailsTo(t.ben.user.email);
    expect(mail.subject).toContain("Member");
    expect(mail.text).toContain("stand-in");
  });

  it("hears about a request only once it's approved", async () => {
    const t = await team({ approvalsEnabled: true });
    vi.mocked(sendEmail).mockClear();
    const request = await book(t, { standInId: t.ben.id });
    expect(request.status).toBe("PENDING");
    expect(mailsTo(t.ben.user.email)).toEqual([]);

    await decideBooking({ workspace: t.workspace, settings: t.settings, actor: t.admin.actor, bookingId: request.id, approve: true, note: null, origin });
    expect(mailsTo(t.ben.user.email)).toHaveLength(1);
  });

  it("isn't told it's sick leave", async () => {
    const t = await team();
    vi.mocked(sendEmail).mockClear();
    await book(t, { type: "SICK", standInId: t.ben.id });
    const [mail] = mailsTo(t.ben.user.email);
    expect(`${mail.subject} ${mail.text}`).not.toMatch(/sick|krank/i);
  });

  it("must be someone else from the same workspace", async () => {
    const t = await team();
    await expect(book(t, { standInId: t.member.id })).rejects.toThrow(errors.standInSelf);
    const other = await makeWorkspace();
    await expect(book(t, { standInId: other.member.id })).rejects.toThrow(errors.standInNotInWorkspace);
    await db.membership.update({ where: { id: t.ben.id }, data: { removedAt: new Date() } });
    await expect(book(t, { standInId: t.ben.id })).rejects.toThrow(errors.standInNotInWorkspace);
  });

  it("is emailed again only when the stand-in or the dates change", async () => {
    const t = await team();
    const booking = await book(t, { standInId: t.ben.id });
    const update = (input: Partial<typeof week> & { standInId?: string | null }) =>
      updateBooking({ workspace: t.workspace, settings: t.settings, actor: t.member.actor, bookingId: booking.id, input: { ...week, ...input }, origin });

    vi.mocked(sendEmail).mockClear();
    await update({ standInId: t.ben.id });
    expect(mailsTo(t.ben.user.email)).toEqual([]);

    await update({ standInId: t.ben.id, end: "2030-03-07" });
    expect(mailsTo(t.ben.user.email)).toHaveLength(1);

    vi.mocked(sendEmail).mockClear();
    await update({ standInId: t.admin.id, end: "2030-03-07" });
    expect(mailsTo(t.admin.user.email)).toHaveLength(1);
    expect(mailsTo(t.ben.user.email)).toEqual([]);
  });
});
