import { describe, expect, it } from "vitest";
import { isTeamsWebhookUrl, teamsMessage } from "./teams";

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
