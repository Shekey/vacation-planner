import { todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { isCronRequest } from "@/lib/security";
import { importHolidays } from "@/lib/holiday-import";
import { purgeOldData } from "@/lib/retention";
import { isLocale } from "@/lib/i18n";

/**
 * Keeps public holidays filled in: imports this year's and next year's for every workspace
 * that has imported a country. Existing days are kept, so manual edits survive.
 * It also deletes data past its retention period (see src/lib/retention.ts).
 * Vercel Cron calls this monthly (see vercel.json) with the CRON_SECRET bearer token.
 */
export async function GET(req: Request) {
  if (!isCronRequest(req)) return new Response("Unauthorized", { status: 401 });

  const workspaces = await db.workspace.findMany({
    where: { settings: { holidayCountry: { not: null } } },
    include: { settings: true },
  });

  let imported = 0;
  const errors: string[] = [];
  for (const ws of workspaces) {
    const year = Number(todayIn(ws.timezone).slice(0, 4));
    for (const y of [year, year + 1]) {
      const result = await importHolidays(ws.id, ws.settings!.holidayCountry!, y, isLocale(ws.settings?.locale) ? ws.settings.locale : "en");
      if ("error" in result) errors.push(`${ws.slug} ${y}: ${result.error}`);
      else imported += result.count;
    }
  }
  const purged = await purgeOldData();
  return Response.json({ workspaces: workspaces.length, imported, errors, purged });
}
