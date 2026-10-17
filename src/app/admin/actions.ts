"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/action-form";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { requireSuperAdmin } from "@/lib/superadmin-session";
import { extendedTrialEnd, parseExtendDays } from "@/lib/superadmin";
import { canRestore } from "@/lib/undo";

/** Gives a trial more days. The reminder emails are reset so the customer is warned again before the new end. */
export async function extendTrialAction(workspaceId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const operator = await requireSuperAdmin();
  const t = (await getMessages()).superadmin.detail;
  const days = parseExtendDays(formData.get("days"));
  if (days === null) return { error: t.extendInvalid };
  const ws = await db.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, trialEndsAt: true } });
  if (!ws) return { error: t.notFound };
  const trialEndsAt = extendedTrialEnd(ws.trialEndsAt, days);
  await db.workspace.update({
    where: { id: ws.id },
    data: { trialEndsAt, trialReminder7SentAt: null, trialReminder1SentAt: null },
  });
  await recordAudit({ workspaceId: ws.id, actorId: operator.id, action: "support.trial_extended", detail: String(days) });
  revalidatePath(`/admin/workspaces/${ws.id}`);
  return { ok: t.extended(formatDateTime(trialEndsAt, await getLocale())) };
}

/** Restores a workspace deleted in the last 30 days, at the customer's request. */
export async function restoreWorkspaceAsOperatorAction(workspaceId: string): Promise<ActionResult> {
  const operator = await requireSuperAdmin();
  const t = (await getMessages()).superadmin.detail;
  const ws = await db.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, deletedAt: true } });
  if (!ws || !canRestore(ws.deletedAt)) return { error: t.notFound };
  await db.workspace.update({ where: { id: ws.id }, data: { deletedAt: null } });
  await recordAudit({ workspaceId: ws.id, actorId: operator.id, action: "support.workspace_restored" });
  revalidatePath(`/admin/workspaces/${ws.id}`);
  revalidatePath("/admin");
  return { ok: t.restored };
}
