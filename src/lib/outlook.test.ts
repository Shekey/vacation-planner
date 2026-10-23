import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/totp";
import {
  authorizeUrl,
  connectState,
  eventFor,
  graphInstant,
  nextAbsence,
  openToken,
  planSync,
  readConnectState,
  replyMessages,
  replyWindow,
  sealToken,
  zonedInstant,
  type SyncBooking,
} from "./outlook";

const secret = "test-secret";
const env = { AUTH_MICROSOFT_ENTRA_ID_ID: "ms-app", AUTH_MICROSOFT_ENTRA_ID_SECRET: "ms-secret" };
const booking = (start: string, end: string, extra: Partial<SyncBooking> = {}): SyncBooking => ({
  id: `b-${start}`,
  start,
  end,
  startPart: "FULL",
  endPart: "FULL",
  workspaceName: "Acme",
  timeZone: "Europe/Berlin",
  standIn: null,
  ...extra,
});

describe("connecting", () => {
  it("signs who started it and what they chose, for 15 minutes", () => {
    const now = new Date("2027-06-01T10:00:00Z");
    const state = connectState({ userId: "u1", autoReply: true }, now, secret);
    expect(readConnectState(state, now, secret)).toEqual({ userId: "u1", autoReply: true });
    expect(readConnectState(state, new Date("2027-06-01T10:14:00Z"), secret)).not.toBeNull();
    expect(readConnectState(state, new Date("2027-06-01T10:16:00Z"), secret)).toBeNull();
    expect(readConnectState(state, now, "other-secret")).toBeNull();
    const [payload, mac] = state.split(".");
    const forged = Buffer.from(Buffer.from(payload, "base64url").toString().replace("u1", "u2")).toString("base64url");
    expect(readConnectState(`${forged}.${mac}`, now, secret)).toBeNull();
  });

  it("asks for the mailbox settings only when the automatic reply was chosen", () => {
    const without = new URL(authorizeUrl("https://app.test", "s", false, env));
    expect(without.origin + without.pathname).toBe("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
    expect(without.searchParams.get("redirect_uri")).toBe("https://app.test/api/outlook/callback");
    expect(without.searchParams.get("scope")).toContain("Calendars.ReadWrite");
    expect(without.searchParams.get("scope")).toContain("offline_access");
    expect(without.searchParams.get("scope")).not.toContain("MailboxSettings");
    expect(new URL(authorizeUrl("https://app.test", "s", true, env)).searchParams.get("scope")).toContain("MailboxSettings.ReadWrite");
  });

  it("keeps the refresh token encrypted with its own key", () => {
    const sealed = sealToken("refresh-1", secret);
    expect(sealed).not.toContain("refresh-1");
    expect(openToken(sealed, secret)).toBe("refresh-1");
    expect(() => decryptSecret(sealed, secret)).toThrow();
    expect(() => openToken(encryptSecret("refresh-1", secret), secret)).toThrow();
  });
});

describe("the event", () => {
  it("is an all-day 'Out of office' that ends the day after, in the workspace's time zone", () => {
    const event = eventFor(booking("2027-07-05", "2027-07-09"), "en");
    expect(event).toMatchObject({
      subject: "Out of office",
      isAllDay: true,
      showAs: "oof",
      start: { dateTime: "2027-07-05T00:00:00", timeZone: "Europe/Berlin" },
      end: { dateTime: "2027-07-10T00:00:00", timeZone: "Europe/Berlin" },
    });
    expect(eventFor(booking("2027-07-05", "2027-07-09"), "de").subject).toBe("Abwesend");
  });

  it("names half days, and never the kind of time off", () => {
    expect(eventFor(booking("2027-07-05", "2027-07-05", { endPart: "AM" }), "en").subject).toBe("Out of office (morning)");
    expect(eventFor(booking("2027-07-05", "2027-07-05", { startPart: "PM" }), "de").subject).toBe("Abwesend (nachmittags)");
    const longer = eventFor(booking("2027-07-05", "2027-07-09", { startPart: "PM", endPart: "AM" }), "en");
    expect(longer.subject).toBe("Out of office");
    expect(longer.body.content).toContain("From the afternoon of 5 Jul");
    expect(longer.body.content).toContain("Until the morning of 9 Jul");
    expect(JSON.stringify(longer)).not.toMatch(/sick|vacation|krank|urlaub /i);
  });
});

describe("planning a sync", () => {
  const stored = [
    { bookingId: "same", eventId: "e1", hash: "h1", end: "2027-07-01" },
    { bookingId: "changed", eventId: "e2", hash: "old", end: "2027-07-01" },
    { bookingId: "cancelled", eventId: "e3", hash: "h3", end: "2027-07-01" },
    { bookingId: "over", eventId: "e4", hash: "h4", end: "2027-05-30" },
  ];
  it("adds new time off, rewrites changed, deletes what's off, and leaves the past in the calendar", () => {
    const plan = planSync(
      [
        { bookingId: "same", hash: "h1" },
        { bookingId: "changed", hash: "new" },
        { bookingId: "new", hash: "h5" },
      ],
      stored,
      "2027-06-01",
    );
    expect(plan.create).toEqual(["new"]);
    expect(plan.update).toEqual(["changed"]);
    expect(plan.remove.map((e) => e.eventId)).toEqual(["e3"]);
    expect(plan.forget.map((e) => e.eventId)).toEqual(["e4"]);
  });
});

describe("the automatic reply", () => {
  it("covers the next time off, joined with time off that follows over a weekend", () => {
    const run = nextAbsence(
      [booking("2027-07-12", "2027-07-16"), booking("2027-07-05", "2027-07-09"), booking("2027-08-02", "2027-08-06"), booking("2027-05-01", "2027-05-03")],
      "2027-06-01",
    );
    expect(run.map((b) => b.start)).toEqual(["2027-07-05", "2027-07-12"]);
    expect(replyWindow(run)).toEqual({ start: "2027-07-05T00:00:00", end: "2027-07-17T00:00:00", timeZone: "Europe/Berlin" });
    expect(nextAbsence([booking("2027-05-01", "2027-05-03")], "2027-06-01")).toEqual([]);
  });

  it("starts and ends at noon for half days", () => {
    expect(replyWindow([booking("2027-07-05", "2027-07-06", { startPart: "PM", endPart: "AM" })])).toMatchObject({
      start: "2027-07-05T12:00:00",
      end: "2027-07-06T12:00:00",
    });
  });

  it("tells colleagues who stands in, but not people outside", () => {
    const run = [booking("2027-07-05", "2027-07-09", { standIn: { name: "Ben", email: "ben@acme.de" } })];
    const en = replyMessages(run, "en");
    expect(en.internal).toContain("Ben (ben@acme.de)");
    expect(en.external).not.toContain("ben@acme.de");
    expect(en.external).toContain("9 July 2027");
    expect(replyMessages(run, "de").external).toContain("bis einschließlich 9. Juli 2027");
  });

  it("reads times in the workspace's zone, also across daylight saving", () => {
    expect(zonedInstant("2027-07-05T00:00:00", "Europe/Berlin").toISOString()).toBe("2027-07-04T22:00:00.000Z");
    expect(zonedInstant("2027-01-05T00:00:00", "Europe/Berlin").toISOString()).toBe("2027-01-04T23:00:00.000Z");
    expect(zonedInstant("2027-03-28T12:00:00", "Europe/Berlin").toISOString()).toBe("2027-03-28T10:00:00.000Z");
  });

  it("reads Microsoft's times in UTC or an IANA zone, and nothing else", () => {
    expect(graphInstant({ dateTime: "2027-07-04T22:00:00.0000000", timeZone: "UTC" })?.toISOString()).toBe("2027-07-04T22:00:00.000Z");
    expect(graphInstant({ dateTime: "2027-07-05T00:00:00", timeZone: "Europe/Berlin" })?.toISOString()).toBe("2027-07-04T22:00:00.000Z");
    expect(graphInstant({ dateTime: "2027-07-05T00:00:00", timeZone: "W. Europe Standard Time" })).toBeNull();
    expect(graphInstant(null)).toBeNull();
  });
});
