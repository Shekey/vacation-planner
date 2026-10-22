import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";
import { postToSlack } from "@/lib/slack";
import { postToTeams } from "@/lib/teams";

export type Channels = { teamsWebhookUrl: string | null; slackWebhookUrl: string | null };

/** Whether a post arrived; `error` is the HTTP status the chat service answered, or "network". */
export type Delivery = { ok: true } | { ok: false; error: string };

export type ChatChannel = "teams" | "slack";

/**
 * Posts to every chat channel the workspace connected. With a workspace id, each channel's result is kept on the
 * workspace so Settings can say when posts stop arriving; a failure also goes to Sentry, without the message.
 */
export async function postToChannels(
  channels: Channels,
  text: string,
  link?: { title: string; url: string },
  workspaceId?: string,
): Promise<Partial<Record<ChatChannel, Delivery>>> {
  const [teams, slack] = await Promise.all([postToTeams(channels.teamsWebhookUrl, text, link), postToSlack(channels.slackWebhookUrl, text, link)]);
  const results = { ...(teams && { teams }), ...(slack && { slack }) };
  if (workspaceId) await recordDeliveries(workspaceId, results);
  return results;
}

async function recordDeliveries(workspaceId: string, results: Partial<Record<ChatChannel, Delivery>>) {
  const data: Record<string, string | Date | null> = {};
  for (const [channel, result] of Object.entries(results) as [ChatChannel, Delivery][]) {
    data[`${channel}Error`] = result.ok ? null : result.error;
    data[`${channel}ErrorAt`] = result.ok ? null : new Date();
    if (!result.ok) {
      Sentry.captureMessage(`${channel} post failed`, { level: "warning", tags: { delivery: channel, status: result.error } });
    }
  }
  if (Object.keys(data).length === 0) return;
  try {
    await db.workspaceSettings.update({ where: { workspaceId }, data });
  } catch (e) {
    console.error("[notify] could not record delivery", e);
  }
}
