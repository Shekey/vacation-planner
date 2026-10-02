/**
 * Microsoft Teams notifications through an incoming webhook: a Teams Workflows
 * ("Post to a channel when a webhook request is received") URL, or a legacy
 * Office 365 connector URL.
 */
const ALLOWED_HOST_SUFFIXES = [".logic.azure.com", ".api.powerplatform.com", ".webhook.office.com"];

/** Accepts only Teams webhook hosts so the server can't be pointed at arbitrary URLs. */
export function isTeamsWebhookUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && ALLOWED_HOST_SUFFIXES.some((suffix) => u.hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

/** An Adaptive Card message, the format both Workflows and connectors accept. */
export function teamsMessage(text: string, link?: { title: string; url: string }) {
  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: [{ type: "TextBlock", text, wrap: true }],
          ...(link ? { actions: [{ type: "Action.OpenUrl", title: link.title, url: link.url }] } : {}),
        },
      },
    ],
  };
}

/** Posts a message; failures are logged and never break the calling action. */
export async function postToTeams(
  webhookUrl: string | null | undefined,
  text: string,
  link?: { title: string; url: string },
): Promise<void> {
  if (!webhookUrl || !isTeamsWebhookUrl(webhookUrl)) return;
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(teamsMessage(text, link)),
      // A webhook that redirects elsewhere is refused rather than followed.
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error("[teams] webhook error", res.status);
  } catch (e) {
    console.error("[teams] webhook failed", e);
  }
}
