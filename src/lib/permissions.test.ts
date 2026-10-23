import { describe, expect, it } from "vitest";
import { can, isRole, type Action } from "./permissions";

const all: Action[] = ["members:manage", "settings:manage", "bookings:manage-all", "bookings:decide", "bookings:own", "sick:see"];
const allowed = (role: Parameters<typeof can>[0]) => all.filter((a) => can(role, a));

describe("can", () => {
  it("lets admins do everything", () => {
    expect(allowed("ADMIN")).toEqual(all);
  });

  it("lets approvers decide and book for others, but not run the workspace or see sick days", () => {
    expect(allowed("APPROVER")).toEqual(["bookings:manage-all", "bookings:decide", "bookings:own"]);
  });

  it("lets members book their own time off only", () => {
    expect(allowed("MEMBER")).toEqual(["bookings:own"]);
  });

  it("lets viewers do nothing but look", () => {
    expect(allowed("VIEWER")).toEqual([]);
  });

  it("knows the roles", () => {
    expect(isRole("APPROVER")).toBe(true);
    expect(isRole("OWNER")).toBe(false);
    expect(isRole(null)).toBe(false);
  });
});
