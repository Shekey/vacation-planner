import { describe, expect, it } from "vitest";
import { can } from "./permissions";

describe("can", () => {
  it("lets admins do everything", () => {
    for (const action of ["members:manage", "settings:manage", "bookings:manage-all", "bookings:decide"] as const) {
      expect(can("ADMIN", action)).toBe(true);
    }
  });
  it("keeps members out of admin actions", () => {
    for (const action of ["members:manage", "settings:manage", "bookings:manage-all", "bookings:decide"] as const) {
      expect(can("MEMBER", action)).toBe(false);
    }
  });
});
