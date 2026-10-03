import { describe, expect, it } from "vitest";
import { isSlackWebhookUrl, slackMessage } from "./slack";

describe("slack", () => {
  it("accepts only Slack incoming webhooks", () => {
    expect(isSlackWebhookUrl("https://hooks.slack.com/services/T0/B0/xyz")).toBe(true);
    expect(isSlackWebhookUrl("http://hooks.slack.com/services/T0/B0/xyz")).toBe(false);
    expect(isSlackWebhookUrl("https://hooks.slack.com.evil.io/services/x")).toBe(false);
    expect(isSlackWebhookUrl("https://example.com/services/x")).toBe(false);
  });
  it("escapes text and adds the link", () =>
    expect(slackMessage("Ana <3 is off", { title: "Open", url: "https://x.de/c" }).text).toBe("Ana &lt;3 is off\n<https://x.de/c|Open>"));
});
