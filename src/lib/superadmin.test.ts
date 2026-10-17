import { describe, expect, it } from "vitest";
import { extendedTrialEnd, isSuperAdminEmail, parseExtendDays, parseSuperAdmins, supportAccessActive } from "./superadmin";

const now = new Date("2026-10-19T12:00:00Z");
const hours = (n: number) => new Date(now.getTime() + n * 3_600_000);

describe("super admin list", () => {
  it("parses commas, spaces and mixed case", () => {
    expect(parseSuperAdmins(" Ajdin@X.de, team@x.de ;ops@x.de\nbad, ")).toEqual(["ajdin@x.de", "team@x.de", "ops@x.de"]);
    expect(parseSuperAdmins(undefined)).toEqual([]);
  });
  it("matches only listed addresses, ignoring case", () => {
    const list = parseSuperAdmins("ajdin@x.de");
    expect(isSuperAdminEmail("Ajdin@X.de", list)).toBe(true);
    expect(isSuperAdminEmail("ajdin@x.de.evil.com", list)).toBe(false);
    expect(isSuperAdminEmail("other@x.de", list)).toBe(false);
  });
  it("nobody is a super admin when the list is empty or the email is missing", () => {
    expect(isSuperAdminEmail("ajdin@x.de", [])).toBe(false);
    expect(isSuperAdminEmail(null, ["ajdin@x.de"])).toBe(false);
    expect(isSuperAdminEmail("", [""])).toBe(false);
  });
});

describe("supportAccessActive", () => {
  it("is on until the time passes", () => {
    expect(supportAccessActive(hours(1), now)).toBe(true);
    expect(supportAccessActive(hours(-1), now)).toBe(false);
    expect(supportAccessActive(null, now)).toBe(false);
  });
});

describe("extendedTrialEnd", () => {
  it("adds days to a running trial", () => {
    expect(extendedTrialEnd(new Date("2026-10-25T12:00:00Z"), 7, now).toISOString()).toBe("2026-11-01T12:00:00.000Z");
  });
  it("counts from today when the trial is over or missing", () => {
    expect(extendedTrialEnd(new Date("2026-10-01T00:00:00Z"), 14, now).toISOString()).toBe("2026-11-02T12:00:00.000Z");
    expect(extendedTrialEnd(null, 1, now).toISOString()).toBe("2026-10-20T12:00:00.000Z");
  });
});

describe("parseExtendDays", () => {
  it("accepts 1 to 60 whole days", () => {
    expect(parseExtendDays("14")).toBe(14);
    expect(parseExtendDays("60")).toBe(60);
  });
  it("rejects everything else", () => {
    for (const v of ["0", "61", "-3", "1.5", "abc", "", null, undefined]) expect(parseExtendDays(v)).toBeNull();
  });
});
