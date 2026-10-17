"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/action-form";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getMessages } from "@/lib/i18n/server";
import { requireAdmin } from "@/lib/session";
import { supportAccessEnds } from "@/lib/superadmin";

/** A workspace admin lets the operator's team look at the workspace for 24 hours, or turns that off again. */
export async function setSupportAccessAction(slug: string, on: boolean): Promise<ActionResult> {
  const { workspace, user } = await requireAdmin(slug);
  const t = (await getMessages()).settings;
  await db.workspace.update({ where: { id: workspace.id }, data: { supportAccessUntil: on ? supportAccessEnds() : null } });
  await recordAudit({
    workspaceId: workspace.id,
    actorId: user.id,
    action: on ? "support.access_granted" : "support.access_revoked",
  });
  revalidatePath(`/w/${slug}/settings`);
  return { ok: on ? t.supportGranted : t.supportRevoked };
}
