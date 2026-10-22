import { forEachWithin, reportCronRun } from "@/lib/cron";
import { todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { isCronRequest } from "@/lib/security";
import { importHolidays } from "@/lib/holiday-import";
import { fetchPublicHolidays } from "@/lib/holidays";
import { isLocale } from "@/lib/i18n";

// Must be a literal: Next.js reads it at build time. Allowed on every Vercel plan.
export const maxDuration = 60;

/** A workspace's holidays are refreshed this often. */
const REFRESH_DAYS = 28;

/**
 * Keeps public holidays filled in: imports this year's and next year's for every workspace that has imported a country.
 * Existing days are kept, so manual edits survive. Runs daily but only touches workspaces not refreshed for
 * REFRESH_DAYS, oldest first, within a time budget; a run that runs out of time leaves the rest for the next day.
 * Vercel Cron calls this daily (see vercel.json) with the CRON_SECRET bearer token.
 */
export async function GET(req: Request) {
  if (!isCronRequest(req)) return new Response("Unauthorized", { status: 401 });

  const due = new Date(Date.now() - REFRESH_DAYS * 86_400_000);
  const workspaces = await db.workspace.findMany({
    where: {
      deletedAt: null,
      settings: { holidayCountry: { not: null }, OR: [{ holidaysRefreshedAt: null }, { holidaysRefreshedAt: { lt: due } }] },
    },
    include: { settings: true },
    orderBy: { settings: { holidaysRefreshedAt: { sort: "asc", nulls: "first" } } },
  });

  // Most workspaces share a country, so each country and year is fetched once per run.
  const fetched = new Map<string, ReturnType<typeof fetchPublicHolidays>>();
  const fetchOnce = (country: string, year: number) => {
    const key = `${country} ${year}`;
    if (!fetched.has(key)) fetched.set(key, fetchPublicHolidays(country, year));
    return fetched.get(key)!;
  };

  let imported = 0;
  const errors: string[] = [];
  const run = await forEachWithin(workspaces, async (ws) => {
    const year = Number(todayIn(ws.timezone).slice(0, 4));
    let ok = true;
    for (const y of [year, year + 1]) {
      const locale = isLocale(ws.settings?.locale) ? ws.settings.locale : "en";
      const result = await importHolidays(ws.id, ws.settings!.holidayCountry!, y, locale, fetchOnce);
      if ("error" in result) {
        errors.push(`${ws.slug} ${y}: ${result.error}`);
        ok = false;
      } else imported += result.count;
    }
    // Failed ones stay due and are tried again tomorrow.
    if (ok) await db.workspaceSettings.update({ where: { workspaceId: ws.id }, data: { holidaysRefreshedAt: new Date() } });
  });
  const problems = [
    ...(run.skipped > 0 ? [`${run.skipped} of ${workspaces.length} workspaces left for the next run: out of time`] : []),
    ...(run.failed > 0 ? [`${run.failed} workspaces failed`] : []),
    ...errors.slice(0, 20),
  ];
  await reportCronRun("holidays", problems);
  return Response.json({ workspaces: workspaces.length, imported, errors, ...run });
}
