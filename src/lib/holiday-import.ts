import { fromISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { countryName } from "@/lib/holiday-regions";
import { fetchPublicHolidays } from "@/lib/holidays";
import { messagesFor, type Locale } from "@/lib/i18n";

/** Imports a year of nationwide and regional holidays into a workspace, keeping ones already there. */
export async function importHolidays(
  workspaceId: string,
  country: string,
  year: number,
  locale: Locale = "en",
): Promise<{ count: number } | { error: string }> {
  const t = messagesFor(locale).errors;
  let holidays;
  try {
    holidays = await fetchPublicHolidays(country, year);
  } catch (e) {
    return { error: t.holidaysLoadFailed((e as Error).message) };
  }
  if (holidays.length === 0) return { error: t.noHolidaysFound(countryName(country, locale), year) };
  await db.holiday.createMany({
    data: holidays.map((h) => ({ workspaceId, date: fromISO(h.date), name: h.name, region: h.region })),
    skipDuplicates: true,
  });
  return { count: holidays.length };
}
