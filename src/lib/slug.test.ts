import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("lowercases and dashes words", () => expect(slugify("Acme Engineering")).toBe("acme-engineering"));
  it("strips accents", () => expect(slugify("Šećer Đak Čokolada")).toBe("secer-dak-cokolada"));
  it("trims stray dashes", () => expect(slugify("  --Hello!!  ")).toBe("hello"));
  it("caps length without a trailing dash", () => {
    const slug = slugify("a".repeat(39) + " bcd");
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("uniqueSlug", () => {
  it("returns the base when free", async () => {
    expect(await uniqueSlug("Team", async () => false)).toBe("team");
  });
  it("appends a counter when taken", async () => {
    const taken = new Set(["team", "team-2"]);
    expect(await uniqueSlug("Team", async (s) => taken.has(s))).toBe("team-3");
  });
  it("falls back when the name has no usable characters", async () => {
    expect(await uniqueSlug("!!!", async () => false)).toBe("workspace");
  });
});
