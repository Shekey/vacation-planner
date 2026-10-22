import { portionOn } from "@/lib/booking-days";
import { activeBookingsBetween, spanOf } from "@/lib/bookings";
import { formatDate, fromISO, isWeekend, todayIn } from "@/lib/dates";
import { forEachWithin, reportCronRun } from "@/lib/cron";
import { db } from "@/lib/db";
import { isCronRequest } from "@/lib/security";
import { messagesFor } from "@/lib/i18n";
import { postToChannels } from "@/lib/notify";
import { settingsOf } from "@/lib/session";
import { appOrigin } from "@/lib/url";

// Must be a literal: Next.js reads it at build time. Allowed on every Vercel plan.
export const maxDuration = 60;

/**
 * Morning "who's out today" post for every workspace with a Teams or Slack webhook (weekdays only).
 * Posts go out a few at a time within a time budget; what didn't fit is reported, not silently dropped.
 * Vercel Cron calls this daily (see vercel.json) with the CRON_SECRET bearer token.
 */
export async function GET(req: Request) {
  if (!isCronRequest(req)) return new Response("Unauthorized", { status: 401 });

  const origin = await appOrigin();
  const workspaces = await db.workspace.findMany({
    where: { deletedAt: null, settings: { OR: [{ teamsWebhookUrl: { not: null } }, { slackWebhookUrl: { not: null } }] } },
    include: { settings: true },
  });

  let posted = 0;
  const run = await forEachWithin(workspaces, async (ws) => {
    const channels = settingsOf(ws);
    if (!channels.teamsWebhookUrl && !channels.slackWebhookUrl) return; // plan without chat
    const today = todayIn(ws.timezone);
    if (isWeekend(today)) return;
    const holiday = await db.holiday.findFirst({
      where: { workspaceId: ws.id, date: fromISO(today), region: { in: [...new Set(["", ws.settings?.holidayRegion ?? ""])] } },
    });
    if (holiday) return;

    const t = messagesFor(channels.locale ?? "en").chat;
    const out = (await activeBookingsBetween(ws.id, today, today))
      .filter((b) => b.status === "APPROVED" && !b.membership.isSample)
      .map((b) => {
        const span = spanOf(b);
        const portion = portionOn(span, today);
        const who = b.membership.user.name ?? b.membership.user.email;
        const when =
          portion === "AM"
            ? t.digest.morning
            : portion === "PM"
              ? t.digest.afternoon
              : span.end === today
                ? t.digest.today
                : t.digest.until(formatDate(span.end, undefined, channels.locale));
        return `• ${who} (${when})`;
      });
    if (out.length === 0) return;

    await postToChannels(
      channels,
      `${t.digest.title(ws.name)}\n\n${out.join("\n\n")}`,
      { title: t.openCalendar, url: `${origin}/w/${ws.slug}/calendar` },
      ws.id,
    );
    posted++;
  });
  const problems = [
    ...(run.skipped > 0 ? [`${run.skipped} of ${workspaces.length} workspaces skipped: out of time`] : []),
    ...(run.failed > 0 ? [`${run.failed} workspaces failed`] : []),
  ];
  await reportCronRun("daily-digest", problems);
  return Response.json({ posted, ...run });
}
