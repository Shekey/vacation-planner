import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { applyPeople, applyTimeOff, planPeople } from "@/lib/import-db";
import { hasNoEmail } from "@/lib/no-email";
import { makeWorkspace } from "@/test/db";

const sheet = "Name;E-Mail;Urlaubstage\nMaria Schulz;;26\n";

/** Monday to Friday of a week in March next year, as ISO dates (the import takes this year to two years ahead). */
function weekNextYear() {
  const monday = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 2, 1));
  while (monday.getUTCDay() !== 1) monday.setUTCDate(monday.getUTCDate() + 1);
  const friday = new Date(monday.getTime() + 4 * 86_400_000);
  return [monday, friday].map((d) => d.toISOString().slice(0, 10));
}

describe("importing people without an email address", () => {
  it("adds them by name, once, and takes their time off by name", async () => {
    const team = await makeWorkspace();
    const actor = { id: team.admin.user.id };
    expect(await applyPeople(team.workspace, team.settings, actor, sheet, { sendWelcome: true, origin: "https://app.test" })).toEqual({
      created: 1,
      emailed: 0,
      emailFailed: 0,
    });
    const maria = await db.membership.findFirstOrThrow({ where: { workspaceId: team.workspace.id, user: { name: "Maria Schulz" } }, include: { user: true } });
    expect(hasNoEmail(maria.user.email)).toBe(true);
    expect(Number(maria.annualAllowanceDays)).toBe(26);

    // The same sheet again finds her instead of adding a second Maria.
    expect((await planPeople(team.workspace, team.settings, sheet)).counts).toMatchObject({ new: 0, exists: 1 });

    const [from, to] = weekNextYear();
    expect(await applyTimeOff(team.workspace, team.settings, actor, `Name;Von;Bis\nmaria schulz;${from};${to}\n`)).toEqual({ created: 1, days: 5 });
    expect(await db.booking.count({ where: { membershipId: maria.id } })).toBe(1);
  });
});
