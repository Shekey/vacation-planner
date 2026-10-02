import { portionOn } from "@/lib/booking-days";
import { activeBookingsBetween, spanOf } from "@/lib/bookings";
import { formatDate, fromISO, isWeekend, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { postToTeams } from "@/lib/teams";
import { appOrigin } from "@/lib/url";

/**
 * Morning "who's out today" post for every workspace with a Teams webhook.
 * Vercel Cron calls this daily (see vercel.json) with the CRON_SECRET bearer token.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const origin = await appOrigin();
  const workspaces = await db.workspace.findMany({
    where: { settings: { teamsWebhookUrl: { not: null } } },
    include: { settings: true },
  });

  let posted = 0;
  for (const ws of workspaces) {
    const today = todayIn(ws.timezone);
    if (isWeekend(today)) continue;
    const holiday = await db.holiday.findFirst({ where: { workspaceId: ws.id, date: fromISO(today) } });
    if (holiday) continue;

    const out = (await activeBookingsBetween(ws.id, today, today))
      .filter((b) => b.status === "APPROVED")
      .map((b) => {
        const span = spanOf(b);
        const portion = portionOn(span, today);
        const who = b.membership.user.name ?? b.membership.user.email;
        const when =
          portion === "AM" ? "morning" : portion === "PM" ? "afternoon" : span.end === today ? "today" : `until ${formatDate(span.end)}`;
        return `• ${who} (${when})`;
      });
    if (out.length === 0) continue;

    await postToTeams(ws.settings?.teamsWebhookUrl, `Out today in ${ws.name}:\n\n${out.join("\n\n")}`, {
      title: "Open team calendar",
      url: `${origin}/w/${ws.slug}/calendar`,
    });
    posted++;
  }
  return Response.json({ posted });
}
