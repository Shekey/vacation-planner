import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { applyPeople, applyTimeOff, planPeople, planTimeOff } from "@/lib/import-db";
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

describe("time off from other tools, planners and calendars", () => {
  async function team() {
    const t = await makeWorkspace();
    await db.user.update({ where: { id: t.member.user.id }, data: { name: "Lena Wagner" } });
    await db.user.update({ where: { id: t.admin.user.id }, data: { name: "Anna Wagner" } });
    return t;
  }

  it("finds people with an email by their name, and asks for the email when a name fits two", async () => {
    const t = await team();
    const [from, to] = weekNextYear();
    const plan = await planTimeOff(
      t.workspace,
      t.settings,
      `Employee;Absence type;Start date;End date;Status\nWagner, Lena;Paid time off;${from};${to};approved\nWagner;Paid time off;${from};${to};approved\nLena Wagner;Paid time off;${from};${to};declined`,
    );
    expect(plan.rows.map((r) => r.error?.code ?? r.membershipId)).toEqual([t.member.id, "ambiguousName", "notApproved"]);
    expect(plan.counts).toMatchObject({ ok: 1, days: 5 });
  });

  it("books a year planner's runs of U for the right person", async () => {
    const t = await team();
    const [monday] = weekNextYear();
    const header = ["Name", ...Array.from({ length: 7 }, (_, i) => new Date(Date.parse(monday) + i * 86_400_000).toISOString().slice(0, 10))];
    const text = [header, ["Lena", "U", "U", "U", "U", "U"], ["Anna W.", "", "", "½"]].map((r) => r.join("\t")).join("\n");
    const result = await applyTimeOff(t.workspace, t.settings, { id: t.admin.user.id }, text);
    expect(result).toEqual({ created: 2, days: 5.5 });
    const lena = await db.booking.findFirstOrThrow({ where: { membershipId: t.member.id } });
    expect([lena.startDate.toISOString().slice(0, 10), Number(lena.daysCount), lena.status]).toEqual([monday, 5, "APPROVED"]);
  });

  it("books all-day events from an Outlook calendar file", async () => {
    const t = await team();
    const [from, to] = weekNextYear();
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "SUMMARY:Urlaub Lena",
      `DTSTART;VALUE=DATE:${from.replace(/-/g, "")}`,
      `DTEND;VALUE=DATE:${new Date(Date.parse(to) + 86_400_000).toISOString().slice(0, 10).replace(/-/g, "")}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const plan = await planTimeOff(t.workspace, t.settings, ics);
    expect(plan.source).toBe("calendar");
    expect(plan.rows[0]).toMatchObject({ status: "ok", membershipId: t.member.id, start: from, end: to, daysCount: 5 });
  });
});

describe("people from a year planner", () => {
  it("adds the names not in yet and recognises the ones who are, even by first name", async () => {
    const t = await makeWorkspace();
    await db.user.update({ where: { id: t.member.user.id }, data: { name: "Lena Wagner" } });
    const header = ["Mitarbeiter", "Anspruch", ...Array.from({ length: 10 }, (_, i) => `2027-03-${String(i + 1).padStart(2, "0")}`)];
    const text = [header, ["Lena", "30", "U"], ["Murat Yilmaz", "28"], ["Summe", "58"]].map((r) => r.join("\t")).join("\n");
    const plan = await planPeople(t.workspace, t.settings, text);
    expect(plan.rows.map((r) => [r.name, r.allowance, r.status])).toEqual([
      ["Lena", 30, "exists"],
      ["Murat Yilmaz", 28, "new"],
    ]);
  });
});
