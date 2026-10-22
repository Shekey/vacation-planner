import { describe, expect, it, vi } from "vitest";
import { createBooking } from "@/lib/bookings";
import { todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { messagesFor } from "@/lib/i18n";
import { requireAdmin } from "@/lib/session";
import { makeWorkspace } from "@/test/db";
import { removeMemberAction, restoreMemberAction, updateMemberAction } from "./actions";

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
