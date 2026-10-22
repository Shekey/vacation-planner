import { afterEach, describe, expect, it, vi } from "vitest";
import { isTeamsWebhookUrl, postToTeams, teamsMessage } from "./teams";

describe("isTeamsWebhookUrl", () => {
  it("accepts Teams Workflows and connector URLs", () => {
    expect(isTeamsWebhookUrl("https://prod-12.westeurope.logic.azure.com:443/workflows/abc/triggers/manual/paths/invoke?sig=x")).toBe(true);
    expect(isTeamsWebhookUrl("https://default123.ab.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/x")).toBe(true);
    expect(isTeamsWebhookUrl("https://contoso.webhook.office.com/webhookb2/abc")).toBe(true);
  });
  it("rejects other hosts and schemes", () => {
    expect(isTeamsWebhookUrl("https://evil.example.com/workflows/x")).toBe(false);
    expect(isTeamsWebhookUrl("http://prod-1.westeurope.logic.azure.com/workflows/x")).toBe(false);
    expect(isTeamsWebhookUrl("https://logic.azure.com.evil.com/x")).toBe(false);
    expect(isTeamsWebhookUrl("not a url")).toBe(false);
  });
});

describe("teamsMessage", () => {
  it("wraps text in an Adaptive Card with an optional link", () => {
    const msg = teamsMessage("Mia is off", { title: "Open calendar", url: "https://x.test/cal" });
    const card = msg.attachments[0].content;
    expect(msg.attachments[0].contentType).toBe("application/vnd.microsoft.card.adaptive");
    expect(card.body[0]).toEqual({ type: "TextBlock", text: "Mia is off", wrap: true });
    expect(card.actions).toEqual([{ type: "Action.OpenUrl", title: "Open calendar", url: "https://x.test/cal" }]);
  });
});

describe("postToTeams", () => {
  const url = "https://prod-12.westeurope.logic.azure.com/workflows/abc";
  afterEach(() => vi.unstubAllGlobals());

  it("says whether the post arrived, so Settings can show a deleted workflow", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 202 })));
    expect(await postToTeams(url, "hi")).toEqual({ ok: true });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));
    expect(await postToTeams(url, "hi")).toEqual({ ok: false, error: "404" });
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("timeout"))));
    expect(await postToTeams(url, "hi")).toEqual({ ok: false, error: "network" });
  });

  it("does nothing without a valid webhook", async () => {
    expect(await postToTeams("https://evil.example.com/x", "hi")).toBeNull();
  });
});
