import { isISODate, type ISODate } from "@/lib/dates";

export type HolidayInput = { date: ISODate; name: string };

type NagerHoliday = { date: string; localName?: string; name?: string; global?: boolean; counties?: string[] | null };

/** Keeps nationwide holidays from a Nager.Date response. */
export function parseNagerHolidays(data: unknown): HolidayInput[] {
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const result: HolidayInput[] = [];
  for (const h of data as NagerHoliday[]) {
    if (!isISODate(h?.date) || h.global === false || seen.has(h.date)) continue;
    seen.add(h.date);
    result.push({ date: h.date, name: (h.localName || h.name || "Holiday").slice(0, 100) });
  }
  return result;
}

/** Fetches a country's public holidays from the free Nager.Date API. */
export async function fetchPublicHolidays(country: string, year: number): Promise<HolidayInput[]> {
  const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${encodeURIComponent(country)}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) throw new Error(`No holiday data for country code "${country}".`);
  if (!res.ok) throw new Error(`Holiday service answered ${res.status}.`);
  if (res.status === 204) return [];
  return parseNagerHolidays(await res.json());
}
