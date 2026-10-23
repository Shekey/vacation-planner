"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/action-form";
import { isISODate, fromISO, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { getMessages } from "@/lib/i18n/server";
import { requireMembership, requirePermission } from "@/lib/session";

/** Creates a new feed URL; any old one stops working. */
export async function resetCalendarFeedAction(slug: string): Promise<ActionResult> {
  const { membership } = await requireMembership(slug);
  await db.membership.update({
    where: { id: membership.id },
    data: { calendarToken: randomBytes(24).toString("base64url") },
  });
  revalidatePath(`/w/${slug}/me`);
  return {};
}

export async function disableCalendarFeedAction(slug: string): Promise<ActionResult> {
  const { membership } = await requireMembership(slug);
  await db.membership.update({ where: { id: membership.id }, data: { calendarToken: null } });
  revalidatePath(`/w/${slug}/me`);
  return {};
}

/** "Away until" for admins and approvers (#80): new requests and reminders go to the others until then. Empty clears it. */
export async function setAwayAction(slug: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { workspace, membership } = await requirePermission(slug, "bookings:decide");
  const t = (await getMessages()).me;
  const raw = String(formData.get("awayUntil") ?? "").trim();
  if (raw !== "" && (!isISODate(raw) || raw < todayIn(workspace.timezone))) return { error: t.awayInvalid };
  await db.membership.update({ where: { id: membership.id }, data: { awayUntil: raw === "" ? null : fromISO(raw) } });
  revalidatePath(`/w/${slug}/me`);
  return { ok: raw === "" ? t.awayCleared : t.awaySaved };
}
