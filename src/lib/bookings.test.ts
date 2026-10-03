import { describe, expect, it } from "vitest";
import { forViewer } from "./bookings";

const bookings = [
  { id: "a", membershipId: "me", type: "SICK" as const, note: "flu" },
  { id: "b", membershipId: "other", type: "SICK" as const, note: "flu" },
  { id: "c", membershipId: "other", type: "VACATION" as const, note: "Lisbon" },
];

describe("forViewer", () => {
  it("shows a colleague's sick leave as other, without the note", () => {
    const seen = forViewer(bookings, { membershipId: "me", role: "MEMBER" }, { hideSickType: true });
    expect(seen.map((b) => [b.type, b.note])).toEqual([
      ["SICK", "flu"],
      ["OTHER", null],
      ["VACATION", "Lisbon"],
    ]);
  });
  it("shows admins everything", () =>
    expect(forViewer(bookings, { membershipId: "me", role: "ADMIN" }, { hideSickType: true })).toEqual(bookings));
  it("shows everything when the workspace turned it off", () =>
    expect(forViewer(bookings, { membershipId: "me", role: "MEMBER" }, { hideSickType: false })).toEqual(bookings));
});
