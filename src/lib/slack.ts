/** Accepts only Slack incoming-webhook URLs so the server can't be pointed at arbitrary hosts. */
export function isSlackWebhookUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "hooks.slack.com" && u.pathname.startsWith("/services/");
  } catch {
    return false;
  }
}

/** Posts a message; failures are logged and never break the calling action. */
export async function postToSlack(webhookUrl: string | null | undefined, text: string): Promise<void> {
  if (!webhookUrl || !isSlackWebhookUrl(webhookUrl)) return;
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error("[slack] webhook error", res.status);
  } catch (e) {
    console.error("[slack] webhook failed", e);
  }
}
