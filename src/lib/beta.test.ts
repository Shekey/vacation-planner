import { afterEach, describe, expect, it, vi } from "vitest";
import { messagesFor } from "./i18n";
import { BETA_MAX_MEMBERS, founderPrice, isBetaMode } from "./beta";

afterEach(() => vi.unstubAllEnvs());

describe("isBetaMode", () => {
  it("is on by default", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_BETA_MODE", "");
    expect(isBetaMode()).toBe(true);
    vi.unstubAllEnvs();
    delete process.env.NEXT_PUBLIC_ENABLE_BETA_MODE;
    expect(isBetaMode()).toBe(true);
  });
  it("stays on for true and for typos", () => {
    for (const v of ["true", "TRUE", "1", "flase"]) {
      vi.stubEnv("NEXT_PUBLIC_ENABLE_BETA_MODE", v);
      expect(isBetaMode()).toBe(true);
    }
  });
  it("is off only for exactly false", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_BETA_MODE", "false");
    expect(isBetaMode()).toBe(false);
  });
});

describe("founder price", () => {
  it("is half the list price", () => {
    expect(founderPrice(39)).toBe(19.5);
    expect(founderPrice(89)).toBe(44.5);
    expect(founderPrice(29)).toBe(14.5);
  });
  it("leaves room for any team we target", () => expect(BETA_MAX_MEMBERS).toBeGreaterThanOrEqual(500));
});

describe("landing page texts", () => {
  it("the FAQ answer swapped out during the beta is the one about the trial", () => {
    // landing.tsx replaces the last FAQ item with beta.faqAfter in beta mode.
    expect(messagesFor("en").landing.faq.items.at(-1)?.q).toMatch(/trial/i);
    expect(messagesFor("de").landing.faq.items.at(-1)?.q).toMatch(/Test/);
  });
  it("beta texts name the founder discount and the regular price in both languages", () => {
    for (const locale of ["en", "de"] as const) {
      const b = messagesFor(locale).landing.beta;
      expect(b.founder.title(50)).toContain("50");
      expect(b.founder.body(50, "€19.50")).toContain("19.50");
      expect(b.now.features).toHaveLength(5);
    }
  });
});
