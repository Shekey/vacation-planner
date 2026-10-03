import { isISODate, type ISODate } from "@/lib/dates";
import type { Locale } from "@/lib/i18n";

/** `region` is an ISO 3166-2 code such as "DE-BE", or "" for a nationwide holiday. */
export type HolidayInput = { date: ISODate; name: string; englishName: string; region: string };

/** The holiday's name for someone using the app in `locale`: English when known, else the local name. */
export function holidayName(h: { name: string; englishName?: string | null }, locale: Locale): string {
  return locale === "en" && h.englishName ? h.englishName : h.name;
}

type NagerHoliday = { date: string; localName?: string; name?: string; global?: boolean; counties?: string[] | null };

/**
 * Nationwide holidays from a Nager.Date response, plus one row per region for regional
 * ones, so each member can get the holidays of the state they work in.
 */
export function parseNagerHolidays(data: unknown): HolidayInput[] {
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const result: HolidayInput[] = [];
  for (const h of data as NagerHoliday[]) {
    if (!isISODate(h?.date)) continue;
    const name = (h.localName || h.name || "Holiday").slice(0, 100);
    const englishName = (h.name || name).slice(0, 100);
    const regions = h.global === false ? (h.counties ?? []).filter((c) => typeof c === "string") : [""];
    for (const region of regions) {
      const key = `${h.date}|${region}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ date: h.date, name, englishName, region });
    }
  }
  return result;
}

/** Fetches a country's public holidays, nationwide and regional, from the free Nager.Date API. */
export async function fetchPublicHolidays(country: string, year: number): Promise<HolidayInput[]> {
  const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${encodeURIComponent(country)}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) throw new Error(`No holiday data for country code "${country}".`);
  if (!res.ok) throw new Error(`Holiday service answered ${res.status}.`);
  if (res.status === 204) return [];
  return parseNagerHolidays(await res.json());
}
