import { describe, expect, it, vi } from "vitest";
import { approveLinkUrl, approveToken, readApproveToken } from "./approve-link";

const secret = "test-secret-test-secret";
const link = { bookingId: "cmbooking123", membershipId: "cmadmin456" };
const now = new Date("2026-10-23T08:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

describe("approve links", () => {
  it("names the booking and admin it was made for, for 7 days", () => {
    const token = approveToken(link, now, secret);
    expect(readApproveToken(token, now, secret)).toEqual(link);
    expect(readApproveToken(token, days(6.9), secret)).toEqual(link);
    expect(readApproveToken(token, days(7.01), secret)).toBeNull();
  });

  it("refuses a changed, cut or foreign token", () => {
    const token = approveToken(link, now, secret);
    const [payload, mac] = token.split(".");
    const other = Buffer.from(`cmother.${link.membershipId}.${Math.floor(days(7).getTime() / 1000)}`).toString("base64url");
    expect(readApproveToken(`${other}.${mac}`, now, secret)).toBeNull();
    expect(readApproveToken(`${payload}.${mac.slice(0, -2)}xx`, now, secret)).toBeNull();
    expect(readApproveToken(payload, now, secret)).toBeNull();
    expect(readApproveToken(`${token}.x`, now, secret)).toBeNull();
    expect(readApproveToken(token, now, "another-secret")).toBeNull();
    expect(readApproveToken("", now, secret)).toBeNull();
  });

  it("builds the page address with the chosen button", () => {
    vi.stubEnv("AUTH_SECRET", secret);
    const url = approveLinkUrl("https://urlaubflow.de", link, "decline", now);
    expect(url).toMatch(/^https:\/\/urlaubflow\.de\/decide\/[\w-]+\.[\w-]+\?d=decline$/);
  });
});
