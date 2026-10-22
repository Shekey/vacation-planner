import { describe, expect, it } from "vitest";
import { isPlainName } from "@/lib/mail-limits";

describe("isPlainName", () => {
  it("accepts team names", () => {
    for (const name of ["Praxis Dr. Meyer", "Müller & Söhne GmbH", "Team Küche"]) expect(isPlainName(name)).toBe(true);
  });
  it("refuses links and addresses", () => {
    for (const name of ["Win a prize https://x.example", "www.example.com/claim", "boss@example.com"]) expect(isPlainName(name)).toBe(false);
  });
});
