import { postToSlack } from "@/lib/slack";
import { postToTeams } from "@/lib/teams";

export type Channels = { teamsWebhookUrl: string | null; slackWebhookUrl: string | null };

/** Posts to every chat channel the workspace connected. */
export async function postToChannels(channels: Channels, text: string, link?: { title: string; url: string }) {
  await Promise.all([postToTeams(channels.teamsWebhookUrl, text, link), postToSlack(channels.slackWebhookUrl, text, link)]);
}
