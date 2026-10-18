import { describe, expect, it } from "vitest";
import { scrubEvent, scrubText } from "./sentry-scrub";

describe("scrubText", () => {
  it("hides emails, including German umlauts", () => {
    expect(scrubText("No user anna.müller+test@praxis-sonne.de found")).toBe("No user [email] found");
  });
  it("hides invite and calendar-feed tokens and sensitive query parameters", () => {
    expect(scrubText("GET /invite/s3cr3t_Token-1 failed")).toBe("GET /invite/[token] failed");
    expect(scrubText("/api/calendar/abcDEF123.ics")).toBe("/api/calendar/[token]");
    expect(scrubText("/api/auth/callback/resend?callbackUrl=%2F&token=abc123&email=a%40b.de")).toBe(
      "/api/auth/callback/resend?callbackUrl=[redacted]&token=[redacted]&email=[redacted]",
    );
  });
  it("leaves ordinary text alone", () => expect(scrubText("Booking_no_overlap violated")).toBe("Booking_no_overlap violated"));
});

describe("scrubEvent", () => {
  const dirty = () => ({
    user: { id: "u1", email: "a@b.de", ip_address: "1.2.3.4" },
    server_name: "ip-10-0-0-1",
    message: "failed for ben@x.de",
    request: {
      url: "https://app.example.de/invite/tok123?x=1",
      cookies: { "authjs.session-token": "secret" },
      data: { email: "a@b.de" },
      query_string: "token=abc",
      headers: { cookie: "authjs.session-token=secret", Authorization: "Bearer x", "User-Agent": "Mozilla", "Accept-Language": "de" },
    },
    exception: {
      values: [{ type: "Error", value: "Cannot find anna@x.de", stacktrace: { frames: [{ filename: "a.ts", vars: { password: "hunter2" } }] } }],
    },
    breadcrumbs: [{ category: "navigation", message: "to /invite/tok999", data: { to: "/api/calendar/feed1" } }],
    extra: { note: "mail carla@x.de" },
  });

  it("removes who the visitor is", () => {
    const e = scrubEvent(dirty()) as ReturnType<typeof dirty>;
    expect(e.user).toBeUndefined();
    expect(e.server_name).toBeUndefined();
    expect(e.request.cookies).toBeUndefined();
    expect(e.request.data).toBeUndefined();
    expect(e.request.query_string).toBeUndefined();
    expect(e.request.headers).toEqual({ "User-Agent": "Mozilla", "Accept-Language": "de" });
  });
  it("scrubs every text that is left", () => {
    const e = scrubEvent(dirty()) as ReturnType<typeof dirty>;
    expect(e.message).toBe("failed for [email]");
    expect(e.request.url).toBe("https://app.example.de/invite/[token]");
    expect(e.exception.values[0].value).toBe("Cannot find [email]");
    expect((e.exception.values[0].stacktrace.frames[0] as Record<string, unknown>).vars).toBeUndefined();
    expect(e.breadcrumbs[0]).toEqual({ category: "navigation", message: "to /invite/[token]", data: { to: "/api/calendar/[token]" } });
    expect(e.extra).toEqual({ note: "mail [email]" });
  });
  it("copes with sparse events", () => expect(scrubEvent({ level: "error" })).toEqual({ level: "error" }));
});
