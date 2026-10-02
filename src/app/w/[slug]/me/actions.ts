"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/action-form";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/session";

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
