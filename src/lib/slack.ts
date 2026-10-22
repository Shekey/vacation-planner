import type { Delivery } from "@/lib/notify";

/** Slack notifications through an incoming webhook (Slack app → Incoming Webhooks → Add New Webhook). */

/** Accepts only Slack webhook URLs so the server can't be pointed at arbitrary hosts. */
export function isSlackWebhookUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "hooks.slack.com" && u.pathname.startsWith("/services/");
  } catch {
    return false;
  }
}

/** Slack mrkdwn: escapes the three characters Slack treats specially. */
function escape(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function slackMessage(text: string, link?: { title: string; url: string }) {
  return { text: link ? `${escape(text)}\n<${link.url}|${escape(link.title)}>` : escape(text) };
}

/** Posts a message and says whether it arrived; null when no valid webhook is set. Never throws. */
export async function postToSlack(
  webhookUrl: string | null | undefined,
  text: string,
  link?: { title: string; url: string },
): Promise<Delivery | null> {
  if (!webhookUrl || !isSlackWebhookUrl(webhookUrl)) return null;
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackMessage(text, link)),
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return { ok: true };
    console.error("[slack] webhook error", res.status);
    return { ok: false, error: String(res.status) };
  } catch (e) {
    console.error("[slack] webhook failed", e);
    return { ok: false, error: "network" };
  }
}
