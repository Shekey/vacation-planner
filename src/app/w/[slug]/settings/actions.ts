"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResult } from "@/components/action-form";
import { isMonthDay } from "@/lib/booking-days";
import { approvalsInUse, approveAllPending, keepLastYearsAllowance } from "@/lib/bookings";
import { todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { isPlainName } from "@/lib/mail-limits";
import { postToChannels, type ChatChannel } from "@/lib/notify";
import { requireAdmin, settingsOf } from "@/lib/session";
import { isSlackWebhookUrl } from "@/lib/slack";
import { stopRenewal } from "@/lib/stripe";
import { isTeamsWebhookUrl } from "@/lib/teams";
import { isLocale, messagesFor, type Messages } from "@/lib/i18n";
import { getMessages } from "@/lib/i18n/server";

function settingsSchema(t: Messages["settings"]) {
  return z.object({
    name: z.string().trim().min(2, t.errors.nameLength).max(60).refine(isPlainName, t.errors.nameLink),
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
    carryOverExpiryMonth: z.string().trim().default(""),
    carryOverExpiryDay: z.string().trim().default(""),
    minPeoplePresent: z
      .string()
      .trim()
      .transform((s) => (s === "" ? null : Number(s)))
      .refine((n) => n === null || (Number.isInteger(n) && n >= 1 && n <= 10000), t.errors.minPeople),
    reminderDays: z
      .string()
      .trim()
      .default("")
      .transform((s) => (s === "" ? null : Number(s)))
      .refine((n) => n === null || (Number.isInteger(n) && n >= 1 && n <= 60), t.errors.days),
    autoApproveDays: z
      .string()
      .trim()
      .default("")
      .transform((s) => (s === "" ? null : Number(s)))
      .refine((n) => n === null || (Number.isInteger(n) && n >= 1 && n <= 60), t.errors.days),
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
  const { carryOverExpiryMonth: month, carryOverExpiryDay: day } = parsed.data;
  const carryOverExpiry = month ? `${month.padStart(2, "0")}-${(day || "1").padStart(2, "0")}` : null;
  if (carryOverExpiry !== null && !isMonthDay(carryOverExpiry)) return { error: t.errors.expiryDay };
  const flags = {
    approvalsEnabled: formData.get("approvalsEnabled") === "on",
    overAllowance: (["WARN", "APPROVAL", "BLOCK"] as const).find((p) => p === formData.get("overAllowance")) ?? "WARN",
    allowHalfDays: formData.get("allowHalfDays") === "on",
    countWeekends: formData.get("countWeekends") === "on",
    defaultAllowanceDays: parsed.data.defaultAllowance,
    maxCarryOverDays: parsed.data.maxCarryOver,
    carryOverExpiry,
    minPeoplePresent: parsed.data.minPeoplePresent,
    reminderDays: parsed.data.reminderDays,
    autoApproveDays: parsed.data.autoApproveDays,
    teamsWebhookUrl: parsed.data.teamsWebhookUrl,
    slackWebhookUrl: parsed.data.slackWebhookUrl,
    locale: parsed.data.locale,
    // A new webhook starts without the old one's delivery problem.
    ...(parsed.data.teamsWebhookUrl !== (ctx.workspace.settings?.teamsWebhookUrl ?? null) && { teamsError: null, teamsErrorAt: null }),
    ...(parsed.data.slackWebhookUrl !== (ctx.workspace.settings?.slackWebhookUrl ?? null) && { slackError: null, slackErrorAt: null }),
  };
  // Requests could be pending before (approvals on, or bookings over the allowance needing approval) but not any more.
  const wasApprovals = approvalsInUse(settingsOf(ctx.workspace));
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
  if (applyToAll) {
    const members = await db.membership.findMany({
      where: { workspaceId: ctx.workspace.id, removedAt: null },
      select: { id: true, annualAllowanceDays: true },
    });
    const newDays = flags.defaultAllowanceDays === null ? null : Number(flags.defaultAllowanceDays);
    await keepLastYearsAllowance(members, newDays, Number(todayIn(ctx.workspace.timezone).slice(0, 4)));
  }
  const [, applied] = applyToAll ? await db.$transaction([updateWorkspace, applyAllowance]) : [await updateWorkspace];

  let note = applied ? t.allowanceApplied(applied.count) : "";
  if (wasApprovals && !approvalsInUse(flags)) {
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
  // Hidden, not deleted: admins can restore it for RESTORE_DAYS, then the daily purge deletes it (src/lib/retention.ts).
  // The plan isn't renewed but keeps running, so a restore brings it back as it was; the purge cancels it.
  await stopRenewal(ctx.workspace.stripeSubscriptionId);
  await db.workspace.update({ where: { id: ctx.workspace.id }, data: { deletedAt: new Date() } });
  await recordAudit({ workspaceId: ctx.workspace.id, actorId: ctx.user.id, action: "workspace.deleted" });
  redirect("/");
}

const CHANNEL_NAMES: Record<ChatChannel, string> = { teams: "Microsoft Teams", slack: "Slack" };

/** Posts a test message to one saved chat channel, so an admin can see the connection works. */
export async function sendTestPostAction(slug: string, channel: ChatChannel): Promise<ActionResult> {
  const ctx = await requireAdmin(slug);
  const t = (await getMessages()).settings;
  const settings = settingsOf(ctx.workspace);
  const name = CHANNEL_NAMES[channel];
  const results = await postToChannels(
    {
      teamsWebhookUrl: channel === "teams" ? settings.teamsWebhookUrl : null,
      slackWebhookUrl: channel === "slack" ? settings.slackWebhookUrl : null,
    },
    messagesFor(settings.locale ?? "en").settings.testText(ctx.workspace.name),
    undefined,
    ctx.workspace.id,
  );
  revalidatePath(`/w/${slug}/settings`);
  const result = results[channel];
  if (!result) return { error: t.testFailed(name) };
  // On failure the card above now shows what went wrong and what to do.
  return result.ok ? { ok: t.testSent(name) } : { error: t.testFailed(name) };
}
