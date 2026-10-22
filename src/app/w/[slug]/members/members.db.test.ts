import { describe, expect, it, vi } from "vitest";
import { createBooking } from "@/lib/bookings";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
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

  it("move onto an account that already exists elsewhere, keeping their bookings", async () => {
    const team = await makeWorkspace();
    await signedInAsAdmin(team);
    const maria = await addMaria(team);
    await db.booking.create({
      data: { workspaceId: team.workspace.id, membershipId: maria.id, createdById: team.admin.user.id, type: "VACATION", status: "APPROVED", startDate: new Date("2030-03-04"), endDate: new Date("2030-03-04"), daysCount: 1 },
    });
    const elsewhere = await makeUser("Maria");

    await updateMemberAction(team.workspace.slug, maria.id, {}, form({ role: "MEMBER", allowance: "20", email: elsewhere.email }));
    const moved = await db.membership.findUniqueOrThrow({ where: { id: maria.id }, include: { bookings: true } });
    expect(moved.userId).toBe(elsewhere.id);
    expect(moved.bookings).toHaveLength(1);
    expect(await db.user.findUnique({ where: { id: maria.userId } })).toBeNull();
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
