import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "./robots";

afterEach(() => vi.unstubAllEnvs());

describe("robots.txt", () => {
  it("blocks everything while indexing is off", () => {
    vi.stubEnv("ALLOW_INDEXING", "");
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });

  it("allows the public pages once ALLOW_INDEXING is true", () => {
    vi.stubEnv("ALLOW_INDEXING", "true");
    const rules = robots().rules as { allow: string; disallow: string[] };
    expect(rules.allow).toBe("/");
    expect(rules.disallow).toContain("/w/");
  });

  it("publishes no sitemap", () => {
    vi.stubEnv("ALLOW_INDEXING", "true");
    expect(robots().sitemap).toBeUndefined();
  });
});
