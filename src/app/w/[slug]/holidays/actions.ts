"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/action-form";
import { fromISO, isISODate } from "@/lib/dates";
import { db } from "@/lib/db";
import { fetchPublicHolidays } from "@/lib/holidays";
import { requireAdmin } from "@/lib/session";

/**
 * Bookings already saved keep their stored day count; holiday changes apply
 * to new and changed bookings, and allowances are recounted live.
 */
function refresh(slug: string) {
  revalidatePath(`/w/${slug}`, "layout");
}

export async function addHolidayAction(slug: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { workspace } = await requireAdmin(slug);
  const date = String(formData.get("date") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  if (!isISODate(date)) return { error: "Pick a date." };
  if (!name) return { error: "Give the holiday a name." };
  await db.holiday.upsert({
    where: { workspaceId_date: { workspaceId: workspace.id, date: fromISO(date) } },
    create: { workspaceId: workspace.id, date: fromISO(date), name },
    update: { name },
  });
  refresh(slug);
  return { ok: "Added." };
}

export async function deleteHolidayAction(slug: string, holidayId: string): Promise<ActionResult> {
  const { workspace } = await requireAdmin(slug);
  await db.holiday.deleteMany({ where: { id: holidayId, workspaceId: workspace.id } });
  refresh(slug);
  return {};
}

export async function importHolidaysAction(slug: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { workspace } = await requireAdmin(slug);
  const country = String(formData.get("country") ?? "").trim().toUpperCase();
  const year = Number(formData.get("year"));
  if (!/^[A-Z]{2}$/.test(country)) return { error: "Use a two-letter country code, like BA, DE or US." };
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { error: "Pick a year." };

  let holidays;
  try {
    holidays = await fetchPublicHolidays(country, year);
  } catch (e) {
    return { error: `Couldn't load holidays: ${(e as Error).message}` };
  }
  if (holidays.length === 0) return { error: `No public holidays found for ${country} in ${year}.` };

  await db.$transaction([
    db.holiday.createMany({
      data: holidays.map((h) => ({ workspaceId: workspace.id, date: fromISO(h.date), name: h.name })),
      skipDuplicates: true,
    }),
    db.workspaceSettings.update({ where: { workspaceId: workspace.id }, data: { holidayCountry: country } }),
  ]);
  refresh(slug);
  return { ok: `Imported ${holidays.length} holidays for ${country} ${year}. Existing dates were kept.` };
}
