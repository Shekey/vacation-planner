"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResult } from "@/components/action-form";
import { approveAllPending } from "@/lib/bookings";
import { db } from "@/lib/db";
import { requireAdmin, settingsOf } from "@/lib/session";
import { isSlackWebhookUrl } from "@/lib/slack";
import { isTeamsWebhookUrl } from "@/lib/teams";
import { isLocale, type Messages } from "@/lib/i18n";
import { getMessages } from "@/lib/i18n/server";

function settingsSchema(t: Messages["settings"]) {
  return z.object({
    name: z.string().trim().min(2, t.errors.nameLength).max(60),
    timezone: z.string().refine((tz) => tz === "UTC" || Intl.supportedValuesOf("timeZone").includes(tz), t.errors.timezone),
    defaultAllowance: z
      .string()
      .trim()
      .transform((s) => (s === "" ? null : Number(s)))
      .refine((n) => n === null || (Number.isFinite(n) && n >= 0 && n <= 365), t.errors.defaultAllowance),
    maxCarryOver: z
      .string()
      .trim()
      .transform((s) => (s === "" ? null : Number(s)))
      .refine((n) => n === null || (Number.isFinite(n) && n >= 0 && n <= 365), t.errors.carryOver),
    minPeoplePresent: z
      .string()
      .trim()
      .transform((s) => (s === "" ? null : Number(s)))
      .refine((n) => n === null || (Number.isInteger(n) && n >= 1 && n <= 10000), t.errors.minPeople),
    teamsWebhookUrl: z
      .string()
      .trim()
      .transform((s) => s || null)
      .refine((u) => u === null || isTeamsWebhookUrl(u), t.errors.teamsUrl),
    slackWebhookUrl: z
      .string()
      .trim()
      .transform((s) => s || null)
      .refine((u) => u === null || isSlackWebhookUrl(u), t.errors.slackUrl),
    locale: z.string().refine(isLocale, t.errors.language),
  });
}

export async function saveSettingsAction(slug: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin(slug);
  const t = (await getMessages()).settings;
  const parsed = settingsSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const flags = {
    approvalsEnabled: formData.get("approvalsEnabled") === "on",
    allowHalfDays: formData.get("allowHalfDays") === "on",
    countWeekends: formData.get("countWeekends") === "on",
    defaultAllowanceDays: parsed.data.defaultAllowance,
    maxCarryOverDays: parsed.data.maxCarryOver,
    minPeoplePresent: parsed.data.minPeoplePresent,
    teamsWebhookUrl: parsed.data.teamsWebhookUrl,
    slackWebhookUrl: parsed.data.slackWebhookUrl,
    locale: parsed.data.locale,
  };
  const wasApprovals = settingsOf(ctx.workspace).approvalsEnabled;
  // The default is copied when someone joins, so people who joined earlier need an explicit update.
  const applyToAll = formData.get("applyAllowanceToAll") === "on";

  const updateWorkspace = db.workspace.update({
    where: { id: ctx.workspace.id },
    data: {
      name: parsed.data.name,
      timezone: parsed.data.timezone,
      settings: {
        upsert: {
          create: flags,
          update: flags,
        },
      },
    },
  });
  const applyAllowance = db.membership.updateMany({
    where: { workspaceId: ctx.workspace.id, removedAt: null },
    data: { annualAllowanceDays: flags.defaultAllowanceDays },
  });
  const [, applied] = applyToAll ? await db.$transaction([updateWorkspace, applyAllowance]) : [await updateWorkspace];

  let note = applied ? t.allowanceApplied(applied.count) : "";
  if (wasApprovals && !flags.approvalsEnabled) {
    const { count } = await approveAllPending(ctx.workspace.id, ctx.user.id);
    if (count) note += t.pendingApproved(count);
  }
  revalidatePath(`/w/${slug}`, "layout");
  return { ok: `${t.saved}${note}` };
}

export async function deleteWorkspaceAction(slug: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin(slug);
  if (String(formData.get("confirmName") ?? "").trim() !== ctx.workspace.name) {
    return { error: (await getMessages()).settings.errors.confirmName };
  }
  // Memberships, bookings, invitations, holidays and settings cascade.
  await db.workspace.delete({ where: { id: ctx.workspace.id } });
  redirect("/");
}
