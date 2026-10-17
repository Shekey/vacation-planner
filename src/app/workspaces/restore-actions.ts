"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/action-form";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getMessages } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { restoreCutoff } from "@/lib/undo";

/** Brings back a workspace deleted in the last RESTORE_DAYS. Only its admins can. */
export async function restoreWorkspaceAction(workspaceId: string): Promise<ActionResult> {
  const user = await requireUser();
  const t = (await getMessages()).home;
  const workspace = await db.workspace.findFirst({
    where: {
      id: workspaceId,
      deletedAt: { gt: restoreCutoff() },
      memberships: { some: { userId: user.id, role: "ADMIN", removedAt: null } },
    },
    select: { id: true, slug: true },
  });
  if (!workspace) return { error: t.restoreFailed };
  await db.workspace.update({ where: { id: workspace.id }, data: { deletedAt: null } });
  await recordAudit({ workspaceId: workspace.id, actorId: user.id, action: "workspace.restored" });
  revalidatePath("/");
  return { ok: t.restored };
}
