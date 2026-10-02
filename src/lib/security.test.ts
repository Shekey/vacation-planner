import { afterEach, describe, expect, it } from "vitest";
import { isCronRequest, safeRedirectPath, secretsMatch } from "./security";

describe("safeRedirectPath", () => {
  it("keeps same-site paths", () => {
    expect(safeRedirectPath("/w/acme")).toBe("/w/acme");
    expect(safeRedirectPath("/invite/abc?x=1")).toBe("/invite/abc?x=1");
  });

  it("falls back for other hosts and odd input", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "/\t/evil.com", "evil", "", undefined, 42]) {
      expect(safeRedirectPath(bad)).toBe("/");
    }
    expect(safeRedirectPath("//evil.com", "/home")).toBe("/home");
  });
});

describe("secretsMatch", () => {
  it("matches only identical, non-empty secrets", () => {
    expect(secretsMatch("abc", "abc")).toBe(true);
    expect(secretsMatch("abc", "abd")).toBe(false);
    expect(secretsMatch("abc", "abcd")).toBe(false);
    expect(secretsMatch("", "")).toBe(false);
    expect(secretsMatch(null, "abc")).toBe(false);
  });
});

describe("isCronRequest", () => {
  const original = process.env.CRON_SECRET;
  afterEach(() => {
    process.env.CRON_SECRET = original;
  });

  const req = (auth?: string) => new Request("https://x.test/api/cron", { headers: auth ? { authorization: auth } : {} });

  it("needs the configured bearer token", () => {
    process.env.CRON_SECRET = "s3cret";
    expect(isCronRequest(req("Bearer s3cret"))).toBe(true);
    expect(isCronRequest(req("Bearer nope"))).toBe(false);
    expect(isCronRequest(req())).toBe(false);
  });

  it("refuses everything when no secret is configured", () => {
    delete process.env.CRON_SECRET;
    expect(isCronRequest(req("Bearer "))).toBe(false);
    expect(isCronRequest(req("Bearer undefined"))).toBe(false);
  });
});
