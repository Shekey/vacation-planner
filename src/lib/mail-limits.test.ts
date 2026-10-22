import { describe, expect, it } from "vitest";
import { dailyColdMailLimit, isPlainName } from "@/lib/mail-limits";

const now = new Date("2026-10-22T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe("dailyColdMailLimit", () => {
  it("is small for a new unpaid workspace and grows with age and payment", () => {
    expect(dailyColdMailLimit({ createdAt: daysAgo(1), paid: false }, now)).toBe(20);
    expect(dailyColdMailLimit({ createdAt: daysAgo(8), paid: false }, now)).toBe(100);
    expect(dailyColdMailLimit({ createdAt: daysAgo(1), paid: true }, now)).toBe(200);
  });
});

describe("isPlainName", () => {
  it("accepts team names", () => {
    for (const name of ["Praxis Dr. Meyer", "Müller & Söhne GmbH", "Team Küche"]) expect(isPlainName(name)).toBe(true);
  });
  it("refuses links and addresses", () => {
    for (const name of ["Win a prize https://x.example", "www.example.com/claim", "boss@example.com"]) expect(isPlainName(name)).toBe(false);
  });
});
