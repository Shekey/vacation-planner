"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/action-form";
import { recordAudit } from "@/lib/audit";
import { isBetaMode } from "@/lib/beta";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { requireSuperAdmin } from "@/lib/superadmin-session";
import { extendedTrialEnd, parseExtendDays } from "@/lib/superadmin";
import { TRIAL_DAYS } from "@/lib/plans";
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

/**
 * Run once when the beta ends: workspaces created during the beta that don't pay yet get a fresh trial from today,
 * so they don't drop to Free the moment beta mode is switched off. Their founder rate stays.
 */
export async function startPostBetaTrialAction(): Promise<ActionResult> {
  await requireSuperAdmin();
  const t = (await getMessages()).superadmin.beta;
  if (isBetaMode()) return { error: t.stillBeta };
  const { count } = await db.workspace.updateMany({
    where: { founderRate: true, deletedAt: null, stripeSubscriptionId: null },
    data: {
      trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86_400_000),
      trialReminder7SentAt: null,
      trialReminder1SentAt: null,
    },
  });
  revalidatePath("/admin");
  return { ok: t.done(count) };
}

/** For the launch checklist: proves Sentry receives errors from the server. The operator sees the result at once. */
export async function sendSentryTestAction(): Promise<ActionResult> {
  await requireSuperAdmin();
  const t = (await getMessages()).superadmin.monitoring;
  if (!Sentry.getClient()?.getOptions().enabled) return { error: t.off };
  Sentry.captureException(new Error("Sentry test from /admin (server)"));
  await Sentry.flush(3000);
  return { ok: t.sent };
}
