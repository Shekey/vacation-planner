import { describe, expect, it } from "vitest";
import { analyticsMode, filterEvent, sanitizePath, sanitizeUrl } from "./analytics";

describe("sanitizePath", () => {
  it("drops query, hash, slugs, ids and tokens", () => {
    expect(sanitizePath("/w/praxis-sonne/calendar?month=2026-11")).toBe("/w/*/calendar");
    expect(sanitizePath("/w/praxis-sonne/book/ck12345")).toBe("/w/*/book");
    expect(sanitizePath("/w/praxis-sonne")).toBe("/w/*");
    expect(sanitizePath("/invite/s3cr3t-token")).toBe("/invite/*");
    expect(sanitizePath("/admin/workspaces/ck999")).toBe("/admin");
  });
  it("leaves ordinary pages alone", () => {
    expect(sanitizePath("/")).toBe("/");
    expect(sanitizePath("/sign-in?sent=1")).toBe("/sign-in");
    expect(sanitizePath("/workspaces/new/")).toBe("/workspaces/new");
  });
});

describe("analyticsMode", () => {
  it("measures the public pages fully", () => {
    for (const p of ["/", "/sign-in", "/datenschutz", "/impressum", "/agb", "/avv/", "/?lang=de"]) expect(analyticsMode(p)).toBe("full");
  });
  it("counts only page views in the signed-in app, including pages with tokens in the URL", () => {
    for (const p of ["/w/praxis/calendar", "/account", "/workspaces/new", "/invite/abc", "/w/x/members"]) expect(analyticsMode(p)).toBe("pageviews");
  });
  it("records nothing for operators", () => {
    for (const p of ["/admin", "/admin/workspaces/ck1", "/two-factor?next=/admin"]) expect(analyticsMode(p)).toBe("none");
  });
});

describe("sanitizeUrl", () => {
  it("keeps origin and cleaned path only", () => {
    expect(sanitizeUrl("https://app.example.de/w/praxis/calendar?month=2026-11#x")).toBe("https://app.example.de/w/*/calendar");
    expect(sanitizeUrl("https://app.example.de/invite/token123")).toBe("https://app.example.de/invite/*");
  });
  it("returns nothing for what isn't a URL", () => {
    expect(sanitizeUrl("not a url")).toBe("");
    expect(sanitizeUrl(undefined)).toBe("");
  });
});

describe("filterEvent", () => {
  const view = (url: string) => ({ event: "$pageview", properties: { $current_url: url, $pathname: new URL(url).pathname, $referrer: "https://www.google.com/search?q=urlaub", extra: 1 } });

  it("cleans the URLs of a page view in the app and keeps the rest", () => {
    const out = filterEvent(view("https://x.de/w/praxis/calendar?month=1"), "/w/praxis/calendar");
    expect(out?.properties).toMatchObject({ $current_url: "https://x.de/w/*/calendar", $pathname: "/w/*/calendar", $referrer: "https://www.google.com/search", extra: 1 });
  });
  it("lets clicks and replay through on public pages only", () => {
    expect(filterEvent({ event: "$autocapture", properties: {} }, "/")).not.toBeNull();
    expect(filterEvent({ event: "$snapshot", properties: {} }, "/sign-in")).not.toBeNull();
    expect(filterEvent({ event: "$autocapture", properties: {} }, "/w/praxis/members")).toBeNull();
    expect(filterEvent({ event: "$snapshot", properties: {} }, "/account")).toBeNull();
  });
  it("drops everything in the operator area", () => {
    expect(filterEvent(view("https://x.de/admin"), "/admin")).toBeNull();
    expect(filterEvent({ event: "$pageview", properties: {} }, "/two-factor")).toBeNull();
  });
  it("keeps a direct visit marked as direct", () => {
    const out = filterEvent({ event: "$pageview", properties: { $referrer: "$direct" } }, "/");
    expect(out?.properties?.$referrer).toBe("$direct");
  });
});
