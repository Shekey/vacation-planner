"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResult } from "@/components/action-form";
import { isMonthDay } from "@/lib/booking-days";
import { approveAllPending } from "@/lib/bookings";
import { db } from "@/lib/db";
import { requireAdmin, settingsOf } from "@/lib/session";
import { isSlackWebhookUrl } from "@/lib/slack";
import { isTeamsWebhookUrl } from "@/lib/teams";

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  timezone: z.string().refine((tz) => tz === "UTC" || Intl.supportedValuesOf("timeZone").includes(tz), "Unknown timezone"),
  defaultAllowance: z
    .string()
    .trim()
    .transform((s) => (s === "" ? null : Number(s)))
    .refine((n) => n === null || (Number.isFinite(n) && n >= 0 && n <= 365), "Default allowance must be 0–365 days"),
  maxCarryOver: z
    .string()
    .trim()
    .transform((s) => (s === "" ? null : Number(s)))
    .refine((n) => n === null || (Number.isFinite(n) && n >= 0 && n <= 365), "Carry-over must be 0–365 days"),
  carryOverExpiryMonth: z.string().trim().default(""),
  carryOverExpiryDay: z.string().trim().default(""),
  minPeoplePresent: z
    .string()
    .trim()
    .transform((s) => (s === "" ? null : Number(s)))
    .refine((n) => n === null || (Number.isInteger(n) && n >= 1 && n <= 10000), "Minimum people must be a whole number"),
  teamsWebhookUrl: z
    .string()
    .trim()
    .transform((s) => s || null)
    .refine(
      (u) => u === null || isTeamsWebhookUrl(u),
      "That isn't a Microsoft Teams webhook URL. Copy the URL from the Teams workflow \"Post to a channel when a webhook request is received\".",
    ),
  slackWebhookUrl: z
    .string()
    .trim()
    .transform((s) => s || null)
    .refine((u) => u === null || isSlackWebhookUrl(u), "That isn't a Slack webhook URL. It starts with https://hooks.slack.com/services/."),
});

export async function saveSettingsAction(slug: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin(slug);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { carryOverExpiryMonth: month, carryOverExpiryDay: day } = parsed.data;
  const carryOverExpiry = month ? `${month.padStart(2, "0")}-${(day || "1").padStart(2, "0")}` : null;
  if (carryOverExpiry !== null && !isMonthDay(carryOverExpiry)) return { error: "That expiry day doesn't exist in that month." };
  const flags = {
    approvalsEnabled: formData.get("approvalsEnabled") === "on",
    allowHalfDays: formData.get("allowHalfDays") === "on",
    countWeekends: formData.get("countWeekends") === "on",
    defaultAllowanceDays: parsed.data.defaultAllowance,
    maxCarryOverDays: parsed.data.maxCarryOver,
    carryOverExpiry,
    minPeoplePresent: parsed.data.minPeoplePresent,
    teamsWebhookUrl: parsed.data.teamsWebhookUrl,
    slackWebhookUrl: parsed.data.slackWebhookUrl,
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

  let note = applied ? ` Allowance set for ${applied.count} ${applied.count === 1 ? "person" : "people"}.` : "";
  if (wasApprovals && !flags.approvalsEnabled) {
    const { count } = await approveAllPending(ctx.workspace.id, ctx.user.id);
    if (count) note += ` ${count} pending request${count === 1 ? " was" : "s were"} approved.`;
  }
  revalidatePath(`/w/${slug}`, "layout");
  return { ok: `Saved.${note}` };
}

export async function deleteWorkspaceAction(slug: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin(slug);
  if (String(formData.get("confirmName") ?? "").trim() !== ctx.workspace.name) {
    return { error: "Type the workspace name exactly to confirm." };
  }
  // Memberships, bookings, invitations, holidays and settings cascade.
  await db.workspace.delete({ where: { id: ctx.workspace.id } });
  redirect("/");
}
