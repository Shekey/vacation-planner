import { describe, expect, it, vi } from "vitest";
import { createBooking } from "@/lib/bookings";
import { todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { acceptInvitation } from "@/lib/invitations";
import { hasNoEmail } from "@/lib/no-email";
import { messagesFor } from "@/lib/i18n";
import { requireAdmin } from "@/lib/session";
import { growTo, makeUser, makeWorkspace } from "@/test/db";
import { addWithoutEmailAction, removeMemberAction, restoreMemberAction, updateMemberAction } from "./actions";

vi.mock("@/lib/session", async (original) => ({ ...(await original<typeof import("@/lib/session")>()), requireAdmin: vi.fn() }));

const t = messagesFor("en").members;
type Team = Awaited<ReturnType<typeof makeWorkspace>>;

/** Runs the next action as this team's admin, the way requireAdmin would after its own check. */
async function signedInAsAdmin(team: Team) {
  const workspace = await db.workspace.findUniqueOrThrow({ where: { id: team.workspace.id }, include: { settings: true } });
  const membership = await db.membership.findUniqueOrThrow({ where: { id: team.admin.id } });
  vi.mocked(requireAdmin).mockResolvedValue({ user: { id: team.admin.user.id, email: team.admin.user.email, name: "Admin" }, membership: { ...membership, workspace }, workspace });
}

/** The invitation link's token from the last email sent to this address. */
function inviteToken(email: string) {
  const mail = vi.mocked(sendEmail).mock.calls.findLast(([m]) => m.to === email);
  const token = mail?.[0].text.match(/\/invite\/([\w-]+)/)?.[1];
  if (!token) throw new Error(`no invitation sent to ${email}`);
  return token;
}

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

describe("the last admin", () => {
  it("can't be made a member or removed", async () => {
    const team = await makeWorkspace();
    await signedInAsAdmin(team);
    expect(await updateMemberAction(team.workspace.slug, team.admin.id, {}, form({ role: "MEMBER", allowance: "20" }))).toEqual({
      error: t.errors.lastAdmin,
    });
    expect(await removeMemberAction(team.workspace.slug, team.admin.id)).toEqual({ error: t.errors.lastAdmin });
  });

  it("can step down once someone else is admin", async () => {
    const team = await makeWorkspace();
    await signedInAsAdmin(team);
    await updateMemberAction(team.workspace.slug, team.member.id, {}, form({ role: "ADMIN", allowance: "20" }));
    expect(await updateMemberAction(team.workspace.slug, team.admin.id, {}, form({ role: "MEMBER", allowance: "20" }))).toEqual({ ok: t.saved });
  });
});

describe("removing and restoring someone", () => {
  it("cancels their future time off and brings it back with them", async () => {
    const team = await makeWorkspace();
    await signedInAsAdmin(team);
    const future = await createBooking({
      workspace: team.workspace,
      settings: team.settings,
      actor: team.admin.actor,
      membershipId: team.member.id,
      input: { type: "VACATION", note: null, start: "2030-03-04", end: "2030-03-08", startPart: "FULL", endPart: "FULL" },
      origin: "https://app.test",
    });

    await removeMemberAction(team.workspace.slug, team.member.id);
    expect((await db.booking.findUniqueOrThrow({ where: { id: future.id } })).status).toBe("CANCELLED");

    expect(await restoreMemberAction(team.workspace.slug, team.member.id)).toEqual({ ok: t.restored(1, 0) });
    expect((await db.booking.findUniqueOrThrow({ where: { id: future.id } })).status).toBe("APPROVED");
  });
});

describe("allowance changes", () => {
  it("keep last year's allowance, so carried-over days don't change after the fact", async () => {
    const team = await makeWorkspace();
    await signedInAsAdmin(team);
    await updateMemberAction(team.workspace.slug, team.member.id, {}, form({ role: "MEMBER", allowance: "25" }));
    const kept = await db.allowanceYear.findMany({ where: { membershipId: team.member.id } });
    expect(kept.map((k) => ({ year: k.year, days: Number(k.days) }))).toEqual([{ year: new Date().getUTCFullYear() - 1, days: 20 }]);
  });

  it("refuses an allowance that isn't a whole or half day", async () => {
    const team = await makeWorkspace();
    await signedInAsAdmin(team);
    expect(await updateMemberAction(team.workspace.slug, team.member.id, {}, form({ role: "MEMBER", allowance: "20.3" }))).toEqual({
      error: t.errors.allowance,
    });
  });
});

describe("people without an email address", () => {
  async function addMaria(team: Team) {
    expect(await addWithoutEmailAction(team.workspace.slug, {}, form({ name: "Maria Schulz" }))).toEqual({ ok: t.noEmail.added("Maria Schulz") });
    return db.membership.findFirstOrThrow({ where: { workspaceId: team.workspace.id, user: { name: "Maria Schulz" } }, include: { user: true } });
  }

  it("are added by name, with the default allowance, and admins book for them", async () => {
    const team = await makeWorkspace();
    await signedInAsAdmin(team);
    const maria = await addMaria(team);
    expect(hasNoEmail(maria.user.email)).toBe(true);
    expect(maria).toMatchObject({ role: "MEMBER", isSample: false });
    expect(Number(maria.annualAllowanceDays)).toBe(20);

    const booking = await createBooking({
      workspace: team.workspace,
      settings: team.settings,
      actor: team.admin.actor,
      membershipId: maria.id,
      input: { type: "VACATION", note: null, start: "2030-03-04", end: "2030-03-08", startPart: "FULL", endPart: "FULL" },
      origin: "https://app.test",
    });
    expect(booking.status).toBe("APPROVED");
  });

  it("count toward the plan", async () => {
    const team = await makeWorkspace({ plan: "FREE", billingStatus: null });
    await growTo(team.workspace.id, 5);
    await signedInAsAdmin(team);
    expect(await addWithoutEmailAction(team.workspace.slug, {}, form({ name: "Maria Schulz" }))).toHaveProperty("error");
  });

  it("can sign in once an admin adds their address, and get told where", async () => {
    const team = await makeWorkspace();
    await signedInAsAdmin(team);
    const maria = await addMaria(team);
    vi.mocked(sendEmail).mockClear();

    const email = `maria-${maria.id}@praxis.test`;
    expect(await updateMemberAction(team.workspace.slug, maria.id, {}, form({ role: "MEMBER", allowance: "20", email }))).toEqual({
      ok: t.noEmail.emailAdded(email),
    });
    expect((await db.user.findUniqueOrThrow({ where: { id: maria.userId } })).email).toBe(email);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: email }));
  });

  it("only join an account that already exists elsewhere once it accepts, keeping their bookings", async () => {
    const team = await makeWorkspace();
    await signedInAsAdmin(team);
    const maria = await addMaria(team);
    await db.booking.create({
      data: { workspaceId: team.workspace.id, membershipId: maria.id, createdById: team.admin.user.id, type: "VACATION", status: "APPROVED", startDate: new Date("2030-03-04"), endDate: new Date("2030-03-04"), daysCount: 1 },
    });
    const elsewhere = await makeUser("");
    vi.mocked(sendEmail).mockClear();

    expect(await updateMemberAction(team.workspace.slug, maria.id, {}, form({ role: "MEMBER", allowance: "20", email: elsewhere.email }))).toEqual({
      ok: t.noEmail.invitedExisting(elsewhere.email),
    });
    // Nothing moved yet: no membership for the account, the placeholder is untouched.
    expect(await db.membership.findFirst({ where: { workspaceId: team.workspace.id, userId: elsewhere.id } })).toBeNull();
    expect((await db.membership.findUniqueOrThrow({ where: { id: maria.id } })).userId).toBe(maria.userId);
    const invitation = await db.invitation.findFirstOrThrow({ where: { workspaceId: team.workspace.id, email: elsewhere.email } });
    expect(invitation.membershipId).toBe(maria.id);

    const token = inviteToken(elsewhere.email);
    expect(await acceptInvitation(token, { id: elsewhere.id, email: elsewhere.email })).toBe(team.workspace.slug);
    const moved = await db.membership.findUniqueOrThrow({ where: { id: maria.id }, include: { bookings: true } });
    expect(moved.userId).toBe(elsewhere.id);
    expect(moved.bookings).toHaveLength(1);
    expect(await db.user.findUnique({ where: { id: maria.userId } })).toBeNull();
    expect((await db.user.findUniqueOrThrow({ where: { id: elsewhere.id } })).name).toBe("Maria Schulz");
  });

  it("bring their bookings along when the account joined meanwhile through another invitation", async () => {
    const team = await makeWorkspace();
    await signedInAsAdmin(team);
    const maria = await addMaria(team);
    await db.booking.create({
      data: { workspaceId: team.workspace.id, membershipId: maria.id, createdById: team.admin.user.id, type: "VACATION", status: "APPROVED", startDate: new Date("2030-03-04"), endDate: new Date("2030-03-04"), daysCount: 1 },
    });
    const elsewhere = await makeUser("Maria");
    vi.mocked(sendEmail).mockClear();
    await updateMemberAction(team.workspace.slug, maria.id, {}, form({ role: "MEMBER", allowance: "20", email: elsewhere.email }));
    const token = inviteToken(elsewhere.email);
    const joined = await db.membership.create({ data: { workspaceId: team.workspace.id, userId: elsewhere.id } });

    await acceptInvitation(token, { id: elsewhere.id, email: elsewhere.email });
    expect(await db.booking.count({ where: { membershipId: joined.id } })).toBe(1);
    expect(await db.membership.findUnique({ where: { id: maria.id } })).toBeNull();
    expect((await db.invitation.findFirstOrThrow({ where: { email: elsewhere.email } })).acceptedAt).not.toBeNull();
  });

  it("can't be taken over through an invitation once removed", async () => {
    const team = await makeWorkspace();
    await signedInAsAdmin(team);
    const maria = await addMaria(team);
    const elsewhere = await makeUser("Maria");
    await updateMemberAction(team.workspace.slug, maria.id, {}, form({ role: "MEMBER", allowance: "20", email: elsewhere.email }));
    await removeMemberAction(team.workspace.slug, maria.id);
    expect((await db.invitation.findFirstOrThrow({ where: { email: elsewhere.email } })).revokedAt).not.toBeNull();
  });

  it("can't take the address of someone already in the team", async () => {
    const team = await makeWorkspace();
    await signedInAsAdmin(team);
    const maria = await addMaria(team);
    const email = team.member.user.email;
    expect(await updateMemberAction(team.workspace.slug, maria.id, {}, form({ role: "MEMBER", allowance: "20", email }))).toEqual({
      error: t.noEmail.errors.inUse(email),
    });
    expect(hasNoEmail((await db.user.findUniqueOrThrow({ where: { id: maria.userId } })).email)).toBe(true);
  });
});

describe("days left over from last year", () => {
  it("are saved for this year, cleared when emptied, and refused when not a number", async () => {
    const team = await makeWorkspace();
    await signedInAsAdmin(team);
    const year = Number(todayIn(team.workspace.timezone).slice(0, 4));
    const save = (carriedOver: string) =>
      updateMemberAction(team.workspace.slug, team.member.id, {}, form({ role: "MEMBER", allowance: "20", carriedOver }));
    const stored = () => db.carriedOver.findUnique({ where: { membershipId_year: { membershipId: team.member.id, year } } });

    expect(await save("2,5")).toEqual({ ok: t.saved });
    expect(Number((await stored())?.days)).toBe(2.5);
    expect(await save("abc")).toEqual({ error: t.errors.carriedOver });
    expect(Number((await stored())?.days)).toBe(2.5);
    expect(await save("")).toEqual({ ok: t.saved });
    expect(await stored()).toBeNull();
  });
});

describe("left-over days that don't expire", () => {
  it("are switched on and off per person for this year, and left alone when the box isn't shown", async () => {
    const team = await makeWorkspace({ carryOverExpiry: "03-31" });
    await signedInAsAdmin(team);
    const year = Number(todayIn(team.workspace.timezone).slice(0, 4));
    const save = (fields: Record<string, string>) =>
      updateMemberAction(team.workspace.slug, team.member.id, {}, form({ role: "MEMBER", allowance: "20", ...fields }));
    const kept = () => db.keepCarriedOver.findUnique({ where: { membershipId_year: { membershipId: team.member.id, year } } });

    expect(await save({ carriedOver: "", keepCarriedShown: "1", keepCarried: "on" })).toEqual({ ok: t.saved });
    expect(await kept()).not.toBeNull();
    // The short form next to the name doesn't send the box, so it doesn't clear it.
    await save({});
    expect(await kept()).not.toBeNull();
    await save({ carriedOver: "", keepCarriedShown: "1" });
    expect(await kept()).toBeNull();
  });
});
