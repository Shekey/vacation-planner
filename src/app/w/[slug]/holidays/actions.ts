"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/action-form";
import { fromISO, isISODate } from "@/lib/dates";
import { db } from "@/lib/db";
import { countryName, isHolidayCountry, isHolidayRegion } from "@/lib/holiday-regions";
import { importHolidays } from "@/lib/holiday-import";
import { requireAdmin, requireMembership } from "@/lib/session";

/**
 * Bookings already saved keep their stored day count; holiday changes apply
 * to new and changed bookings, and allowances are recounted live.
 */
function refresh(slug: string) {
  revalidatePath(`/w/${slug}`, "layout");
}

/** "" for everyone, or a region of the workspace's country. */
function regionFrom(formData: FormData, country: string): string | null {
  const region = String(formData.get("region") ?? "");
  return region === "" || isHolidayRegion(country, region) ? region : null;
}

export async function addHolidayAction(slug: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { workspace } = await requireAdmin(slug);
  const date = String(formData.get("date") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const region = regionFrom(formData, workspace.settings?.holidayCountry ?? "");
  if (!isISODate(date)) return { error: "Pick a date." };
  if (!name) return { error: "Give the holiday a name." };
  if (region === null) return { error: "Pick a region from the list." };
  await db.holiday.upsert({
    where: { workspaceId_date_region: { workspaceId: workspace.id, date: fromISO(date), region } },
    create: { workspaceId: workspace.id, date: fromISO(date), name, region },
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

/** Imports nationwide and regional holidays for a country, and remembers the country and default region. */
export async function importHolidaysAction(slug: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { workspace } = await requireAdmin(slug);
  const country = String(formData.get("country") ?? "").trim().toUpperCase();
  const year = Number(formData.get("year"));
  if (!isHolidayCountry(country)) return { error: "Pick a country." };
  const region = regionFrom(formData, country);
  if (region === null) return { error: "Pick a region from the list." };
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { error: "Pick a year." };

  const result = await importHolidays(workspace.id, country, year);
  if ("error" in result) return result;

  await db.workspaceSettings.update({
    where: { workspaceId: workspace.id },
    data: { holidayCountry: country, holidayRegion: region || null },
  });
  refresh(slug);
  return { ok: `Imported ${result.count} holidays for ${countryName(country)} ${year}. Existing ones were kept.` };
}

/** A member says which region they work in; "" means the workspace default. */
export async function setMyRegionAction(slug: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { workspace, membership } = await requireMembership(slug);
  const region = regionFrom(formData, workspace.settings?.holidayCountry ?? "");
  if (region === null) return { error: "Pick a region from the list." };
  await db.membership.update({ where: { id: membership.id }, data: { holidayRegion: region || null } });
  refresh(slug);
  return { ok: "Saved." };
}
