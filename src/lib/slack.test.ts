import { describe, expect, it } from "vitest";
import { isSlackWebhookUrl } from "./slack";

describe("isSlackWebhookUrl", () => {
  it("accepts Slack webhooks", () => expect(isSlackWebhookUrl("https://hooks.slack.com/services/T0/B0/xyz")).toBe(true));
  it("rejects other hosts and schemes", () => {
    expect(isSlackWebhookUrl("https://evil.example.com/services/x")).toBe(false);
    expect(isSlackWebhookUrl("http://hooks.slack.com/services/x")).toBe(false);
    expect(isSlackWebhookUrl("https://hooks.slack.com.evil.com/services/x")).toBe(false);
    expect(isSlackWebhookUrl("not a url")).toBe(false);
  });
});
