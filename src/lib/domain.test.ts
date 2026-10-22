import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { afterEach, describe, expect, it, vi } from "vitest";
import { domainRedirects, LEGACY_HOST, siteOrigin } from "./domain";

afterEach(() => vi.unstubAllEnvs());

function production(url: string) {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", url);
}

/** Where a request to host + path goes, or null when no rule matches; uses Next's own route matcher. */
function redirectFor(host: string, path: string): string | null {
  for (const r of domainRedirects()) {
    if (r.has[0].value !== host) continue;
    const params = getPathMatch(r.source)(path);
    if (!params) continue;
    const name = r.destination.includes(":path*") ? ":path*" : ":path";
    const value = [params.path].flat().filter(Boolean).join("/");
    return r.destination.replace(name, value);
  }
  return null;
}

describe("siteOrigin", () => {
  it("is the configured origin in production", () => {
    production("https://urlaubflow.de/");
    expect(siteOrigin()).toBe("https://urlaubflow.de");
  });
  it("is unset on previews, without the variable and for a malformed value", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://urlaubflow.de");
    expect(siteOrigin()).toBeNull();
    production("");
    expect(siteOrigin()).toBeNull();
    production("urlaubflow");
    expect(siteOrigin()).toBeNull();
  });
});

describe("domainRedirects", () => {
  it("does nothing until the site origin is set, so the old address keeps working", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(domainRedirects()).toEqual([]);
  });

  it("sends the old address to the new domain with the path", () => {
    production("https://urlaubflow.de");
    expect(redirectFor(LEGACY_HOST, "/")).toBe("https://urlaubflow.de/");
    expect(redirectFor(LEGACY_HOST, "/w/praxis/calendar")).toBe("https://urlaubflow.de/w/praxis/calendar");
    expect(redirectFor(LEGACY_HOST, "/sign-in/confirm")).toBe("https://urlaubflow.de/sign-in/confirm");
    expect(redirectFor(LEGACY_HOST, "/api/auth/callback/resend")).toBe("https://urlaubflow.de/api/auth/callback/resend");
    expect(domainRedirects().every((r) => r.permanent)).toBe(true);
  });

  it("keeps calendar feeds, the Stripe webhook and crons on the old address", () => {
    production("https://urlaubflow.de");
    expect(redirectFor(LEGACY_HOST, "/api/calendar/abc123.ics")).toBeNull();
    expect(redirectFor(LEGACY_HOST, "/api/stripe/webhook")).toBeNull();
    expect(redirectFor(LEGACY_HOST, "/api/cron/daily-digest")).toBeNull();
    // Only those exact folders: a page that merely starts with the same letters still moves.
    expect(redirectFor(LEGACY_HOST, "/api/calendars")).toBe("https://urlaubflow.de/api/calendars");
  });

  it("sends www to the apex", () => {
    production("https://urlaubflow.de");
    expect(redirectFor("www.urlaubflow.de", "/")).toBe("https://urlaubflow.de/");
    expect(redirectFor("www.urlaubflow.de", "/impressum")).toBe("https://urlaubflow.de/impressum");
  });

  it("leaves the new domain itself alone", () => {
    production("https://urlaubflow.de");
    expect(redirectFor("urlaubflow.de", "/")).toBeNull();
  });
});
