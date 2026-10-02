"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/components/action-form";
import { approveAllPending } from "@/lib/bookings";
import { db } from "@/lib/db";
import { requireAdmin, settingsOf } from "@/lib/session";

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  timezone: z.string().refine((tz) => tz === "UTC" || Intl.supportedValuesOf("timeZone").includes(tz), "Unknown timezone"),
  defaultAllowance: z
    .string()
    .trim()
    .transform((s) => (s === "" ? null : Number(s)))
    .refine((n) => n === null || (Number.isFinite(n) && n >= 0 && n <= 365), "Default allowance must be 0–365 days"),
});

export async function saveSettingsAction(slug: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin(slug);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const flags = {
    approvalsEnabled: formData.get("approvalsEnabled") === "on",
    allowHalfDays: formData.get("allowHalfDays") === "on",
    countWeekends: formData.get("countWeekends") === "on",
  };
  const wasApprovals = settingsOf(ctx.workspace).approvalsEnabled;

  await db.workspace.update({
    where: { id: ctx.workspace.id },
    data: {
      name: parsed.data.name,
      timezone: parsed.data.timezone,
      settings: {
        upsert: {
          create: { ...flags, defaultAllowanceDays: parsed.data.defaultAllowance },
          update: { ...flags, defaultAllowanceDays: parsed.data.defaultAllowance },
        },
      },
    },
  });

  let note = "";
  if (wasApprovals && !flags.approvalsEnabled) {
    const { count } = await approveAllPending(ctx.workspace.id, ctx.user.id);
    if (count) note = ` ${count} pending request${count === 1 ? " was" : "s were"} approved.`;
  }
  revalidatePath(`/w/${slug}`, "layout");
  return { ok: `Saved.${note}` };
}
