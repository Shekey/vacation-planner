import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { formatDate, fromISO, toISO, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/session";
import { addHolidayAction, deleteHolidayAction, importHolidaysAction } from "./actions";

export default async function HolidaysPage({ params, searchParams }: PageProps<"/w/[slug]/holidays">) {
  const { slug } = await params;
  const query = await searchParams;
  const { workspace, membership } = await requireMembership(slug);
  const isAdmin = membership.role === "ADMIN";
  const today = todayIn(workspace.timezone);
  const currentYear = Number(today.slice(0, 4));
  const year = Number(query.year) >= 2000 && Number(query.year) <= 2100 ? Number(query.year) : currentYear;

  const holidays = await db.holiday.findMany({
    where: { workspaceId: workspace.id, date: { gte: fromISO(`${year}-01-01`), lte: fromISO(`${year}-12-31`) } },
    orderBy: { date: "asc" },
  });
  const country = workspace.settings?.holidayCountry ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href={`?year=${year - 1}`} className="rounded-md border border-black/20 px-2.5 py-1 dark:border-white/25" aria-label="Previous year">
          ←
        </Link>
        <h2 className="min-w-40 text-center text-lg font-semibold">Holidays {year}</h2>
        <Link href={`?year=${year + 1}`} className="rounded-md border border-black/20 px-2.5 py-1 dark:border-white/25" aria-label="Next year">
          →
        </Link>
      </div>
      <p className="text-sm opacity-70">Everyone is off on these days, and they don&apos;t count against anyone&apos;s allowance.</p>

      {holidays.length === 0 ? (
        <p className="opacity-70">No holidays for {year} yet.{isAdmin && " Import your country's below, or add them one by one."}</p>
      ) : (
        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {holidays.map((h) => {
            const iso = toISO(h.date);
            return (
              <li key={h.id} className={`flex items-center justify-between gap-3 py-2 ${iso < today ? "opacity-60" : ""}`}>
                <span>
                  <span className="inline-block w-36 font-medium">{formatDate(iso, { weekday: "short", day: "numeric", month: "short" })}</span>
                  {h.name}
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
            <ActionForm action={importHolidaysAction.bind(null, slug)} className="flex flex-wrap items-end gap-2">
              <label className="space-y-1">
                <span className="block text-sm">Country code</span>
                <input name="country" className="input w-24 uppercase" maxLength={2} required defaultValue={country} placeholder="BA" />
              </label>
              <label className="space-y-1">
                <span className="block text-sm">Year</span>
                <input name="year" type="number" className="input w-28" defaultValue={year} min={2000} max={2100} required />
              </label>
              <button className="btn">Import</button>
            </ActionForm>
            <p className="text-xs opacity-60">Nationwide holidays from date.nager.at. Regional ones can be added by hand.</p>
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
              <button className="btn">Add</button>
            </ActionForm>
          </section>
        </div>
      )}
    </div>
  );
}
