import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { regionOf } from "@/lib/bookings";
import { formatDate, fromISO, toISO, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { countryName, HOLIDAY_REGIONS } from "@/lib/holiday-regions";
import { requireMembership, settingsOf } from "@/lib/session";
import { addHolidayAction, deleteHolidayAction, importHolidaysAction, setMyRegionAction } from "./actions";
import { HolidayImportForm } from "./holiday-import-form";

export default async function HolidaysPage({ params, searchParams }: PageProps<"/w/[slug]/holidays">) {
  const { slug } = await params;
  const query = await searchParams;
  const { workspace, membership } = await requireMembership(slug);
  const settings = settingsOf(workspace);
  const isAdmin = membership.role === "ADMIN";
  const today = todayIn(workspace.timezone);
  const currentYear = Number(today.slice(0, 4));
  const year = Number(query.year) >= 2000 && Number(query.year) <= 2100 ? Number(query.year) : currentYear;
  const showAll = query.all === "1";

  const country = workspace.settings?.holidayCountry ?? "";
  const regions = HOLIDAY_REGIONS[country] ?? [];
  const regionName = (code: string) => regions.find((r) => r.code === code)?.name ?? code;
  const myRegion = regionOf(membership, settings);

  const holidays = await db.holiday.findMany({
    where: {
      workspaceId: workspace.id,
      date: { gte: fromISO(`${year}-01-01`), lte: fromISO(`${year}-12-31`) },
      ...(showAll ? {} : { region: { in: [...new Set(["", myRegion])] } }),
    },
    orderBy: [{ date: "asc" }, { region: "asc" }],
  });
  const hasRegional = showAll || (await db.holiday.count({ where: { workspaceId: workspace.id, region: { not: "" } } })) > 0;
  const yearLink = (y: number) => `?year=${y}${showAll ? "&all=1" : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href={yearLink(year - 1)} className="rounded-md border border-black/20 px-2.5 py-1 dark:border-white/25" aria-label="Previous year">
          ←
        </Link>
        <h2 className="min-w-40 text-center text-lg font-semibold">Holidays {year}</h2>
        <Link href={yearLink(year + 1)} className="rounded-md border border-black/20 px-2.5 py-1 dark:border-white/25" aria-label="Next year">
          →
        </Link>
      </div>
      <p className="text-sm opacity-70">
        Nobody books time off on these days, and they don&apos;t count against anyone&apos;s allowance.
        {country && ` Public holidays for ${countryName(country)}.`}
      </p>

      {regions.length > 0 && (
        <ActionForm action={setMyRegionAction.bind(null, slug)} className="card flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="my-region" className="font-medium">I work in</label>
          <select id="my-region" name="region" defaultValue={membership.holidayRegion ?? ""} className="input w-auto py-1">
            <option value="">
              {settings.holidayRegion ? `Team default (${regionName(settings.holidayRegion)})` : "Nationwide holidays only"}
            </option>
            {regions.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
          <button className="rounded-md border border-black/20 px-2 py-1 dark:border-white/25">Save</button>
        </ActionForm>
      )}

      {hasRegional && (
        <p className="text-sm">
          {showAll ? (
            <Link href={`?year=${year}`} className="underline">
              Show only my holidays
            </Link>
          ) : (
            <>
              Showing nationwide holidays{myRegion && ` and ${regionName(myRegion)}`}.{" "}
              <Link href={`?year=${year}&all=1`} className="underline">
                Show all regions
              </Link>
            </>
          )}
        </p>
      )}

      {holidays.length === 0 ? (
        <p className="opacity-70">No holidays for {year} yet.{isAdmin && " Import your country's below, or add them one by one."}</p>
      ) : (
        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {holidays.map((h) => {
            const iso = toISO(h.date);
            return (
              <li key={h.id} className={`flex items-center justify-between gap-3 py-2 ${iso < today ? "opacity-60" : ""}`}>
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="inline-block w-36 font-medium">{formatDate(iso, { weekday: "short", day: "numeric", month: "short" })}</span>
                  <span>{h.name}</span>
                  {h.region && <span className="text-xs opacity-60">{regionName(h.region)} only</span>}
                </span>
                {isAdmin && (
                  <ActionForm action={deleteHolidayAction.bind(null, slug, h.id)}>
                    <button className="text-sm text-red-600 underline">Remove</button>
                  </ActionForm>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card space-y-3">
            <h3 className="font-medium">Import public holidays</h3>
            <HolidayImportForm
              action={importHolidaysAction.bind(null, slug)}
              country={country}
              region={settings.holidayRegion ?? ""}
              year={year}
            />
            <p className="text-xs opacity-60">
              Nationwide and regional holidays from date.nager.at. This year&apos;s and next year&apos;s are refreshed automatically each month.
            </p>
          </section>
          <section className="card space-y-3">
            <h3 className="font-medium">Add a day</h3>
            <ActionForm action={addHolidayAction.bind(null, slug)} className="flex flex-wrap items-end gap-2" resetOnSuccess>
              <label className="space-y-1">
                <span className="block text-sm">Date</span>
                <input name="date" type="date" className="input" required />
              </label>
              <label className="min-w-40 flex-1 space-y-1">
                <span className="block text-sm">Name</span>
                <input name="name" className="input" required maxLength={100} placeholder="Company day off" />
              </label>
              {regions.length > 0 && (
                <label className="space-y-1">
                  <span className="block text-sm">For</span>
                  <select name="region" className="input w-auto" defaultValue="">
                    <option value="">Everyone</option>
                    {regions.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.name} only
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button className="btn">Add</button>
            </ActionForm>
          </section>
        </div>
      )}
    </div>
  );
}
