"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/action-form";
import { fromISO, isISODate } from "@/lib/dates";
import { db } from "@/lib/db";
import { countryName, isHolidayCountry, isHolidayRegion } from "@/lib/holiday-regions";
import { importHolidays } from "@/lib/holiday-import";
import { getLocale, getMessages } from "@/lib/i18n/server";
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
  const name = String(formData.get("name") ?? "")
    .trim()
    .slice(0, 100);
  const region = regionFrom(formData, workspace.settings?.holidayCountry ?? "");
  const t = (await getMessages()).holidays;
  if (!isISODate(date)) return { error: t.pickDate };
  if (!name) return { error: t.nameRequired };
  if (region === null) return { error: t.pickRegion };
  await db.holiday.upsert({
    where: { workspaceId_date_region: { workspaceId: workspace.id, date: fromISO(date), region } },
    create: { workspaceId: workspace.id, date: fromISO(date), name, region },
    update: { name },
  });
  refresh(slug);
  return { ok: t.added };
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
  const country = String(formData.get("country") ?? "")
    .trim()
    .toUpperCase();
  const year = Number(formData.get("year"));
  const t = (await getMessages()).holidays;
  if (!isHolidayCountry(country)) return { error: t.pickCountry };
  const region = regionFrom(formData, country);
  if (region === null) return { error: t.pickRegion };
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { error: t.pickYear };

  const result = await importHolidays(workspace.id, country, year);
  if ("error" in result) return result;

  await db.workspaceSettings.update({
    where: { workspaceId: workspace.id },
    data: { holidayCountry: country, holidayRegion: region || null },
  });
  refresh(slug);
  return { ok: t.imported(result.count, countryName(country, await getLocale()), year) };
}

/** A member says which region they work in; "" means the workspace default. */
export async function setMyRegionAction(slug: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { workspace, membership } = await requireMembership(slug);
  const region = regionFrom(formData, workspace.settings?.holidayCountry ?? "");
  const t = (await getMessages()).holidays;
  if (region === null) return { error: t.pickRegion };
  await db.membership.update({ where: { id: membership.id }, data: { holidayRegion: region || null } });
  refresh(slug);
  return { ok: t.saved };
}
