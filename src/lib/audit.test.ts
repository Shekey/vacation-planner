import { describe, expect, it } from "vitest";
import { bookingDetail, parseBookingDetail } from "./audit";

describe("booking detail", () => {
  it("round-trips the dates", () => {
    const detail = bookingDetail({ start: "2026-11-02", end: "2026-11-04" });
    expect(detail).toBe("2026-11-02/2026-11-04");
    expect(parseBookingDetail(detail)).toEqual({ start: "2026-11-02", end: "2026-11-04" });
  });
  it("ignores details that aren't dates", () => {
    expect(parseBookingDetail("ADMIN")).toBeNull();
    expect(parseBookingDetail(null)).toBeNull();
  });
});
