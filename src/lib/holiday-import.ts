import { fromISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { countryName } from "@/lib/holiday-regions";
import { fetchPublicHolidays } from "@/lib/holidays";

/** Imports a year of nationwide and regional holidays into a workspace, keeping ones already there. */
export async function importHolidays(
  workspaceId: string,
  country: string,
  year: number,
): Promise<{ count: number } | { error: string }> {
  let holidays;
  try {
    holidays = await fetchPublicHolidays(country, year);
  } catch (e) {
    return { error: `Couldn't load holidays: ${(e as Error).message}` };
  }
  if (holidays.length === 0) return { error: `No public holidays found for ${countryName(country)} in ${year}.` };
  await db.holiday.createMany({
    data: holidays.map((h) => ({ workspaceId, date: fromISO(h.date), name: h.name, region: h.region })),
    skipDuplicates: true,
  });
  return { count: holidays.length };
}
