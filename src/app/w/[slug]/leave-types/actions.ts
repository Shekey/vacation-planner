"use server";

import { revalidatePath } from "next/cache";
import { isLeaveColor } from "@/components/badges";
import type { ActionResult } from "@/components/action-form";
import { db } from "@/lib/db";
import type { Messages } from "@/lib/i18n";
import { getMessages } from "@/lib/i18n/server";
import { isPlainName } from "@/lib/mail-limits";
import { requireAdmin } from "@/lib/session";

const MAX_TYPES = 20;

/** The fields of the leave type form, or the first problem with them. */
function parse(formData: FormData, t: Messages["leaveTypes"]["errors"]) {
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "");
  const countsAsVacation = formData.get("countsAsVacation") === "on";
  const rawAllowance = String(formData.get("allowanceDays") ?? "").trim().replace(",", ".");
  const allowance = rawAllowance === "" ? null : Number(rawAllowance);
  if (name.length < 2 || name.length > 40 || !isPlainName(name)) return { error: t.name };
  if (!isLeaveColor(color)) return { error: t.color };
  if (allowance !== null && !(Number.isFinite(allowance) && allowance >= 0.5 && allowance <= 365 && Number.isInteger(allowance * 2))) {
    return { error: t.allowance };
  }
  return {
    data: {
      name,
      color,
      countsAsVacation,
      // Vacation-like types use the vacation allowance; an own one would count the days twice.
      allowanceDays: countsAsVacation ? null : allowance,
      needsApproval: formData.get("needsApproval") === "on",
    },
  };
}

async function nameTaken(workspaceId: string, name: string, except?: string) {
  const found = await db.leaveType.findFirst({
    where: { workspaceId, archivedAt: null, name: { equals: name, mode: "insensitive" }, ...(except ? { id: { not: except } } : {}) },
  });
  return !!found;
}

function refresh(slug: string) {
  revalidatePath(`/w/${slug}`, "layout");
}

export async function createLeaveTypeAction(slug: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { workspace } = await requireAdmin(slug);
  const t = (await getMessages()).leaveTypes;
  const parsed = parse(formData, t.errors);
  if (!parsed.data) return { error: parsed.error };
  if ((await db.leaveType.count({ where: { workspaceId: workspace.id, archivedAt: null } })) >= MAX_TYPES) return { error: t.errors.tooMany };
  if (await nameTaken(workspace.id, parsed.data.name)) return { error: t.errors.taken };
  await db.leaveType.create({ data: { ...parsed.data, workspaceId: workspace.id } });
  refresh(slug);
  return { ok: t.added };
}

export async function updateLeaveTypeAction(slug: string, leaveTypeId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { workspace } = await requireAdmin(slug);
  const t = (await getMessages()).leaveTypes;
  const parsed = parse(formData, t.errors);
  if (!parsed.data) return { error: parsed.error };
  const existing = await db.leaveType.findFirst({ where: { id: leaveTypeId, workspaceId: workspace.id } });
  if (!existing) return { error: (await getMessages()).errors.leaveTypeGone };
  if (await nameTaken(workspace.id, parsed.data.name, existing.id)) return { error: t.errors.taken };
  await db.$transaction([
    db.leaveType.update({ where: { id: existing.id }, data: parsed.data }),
    // Its bookings follow, so they count against the vacation allowance (or stop to) from now on.
    ...(existing.countsAsVacation !== parsed.data.countsAsVacation
      ? [
          db.booking.updateMany({
            where: { workspaceId: workspace.id, leaveTypeId: existing.id },
            data: { type: parsed.data.countsAsVacation ? "VACATION" : "OTHER" },
          }),
        ]
      : []),
  ]);
  refresh(slug);
  return { ok: t.saved };
}

/** Bookings keep a removed type; it just can't be picked any more. */
export async function archiveLeaveTypeAction(slug: string, leaveTypeId: string): Promise<ActionResult> {
  const { workspace } = await requireAdmin(slug);
  await db.leaveType.updateMany({ where: { id: leaveTypeId, workspaceId: workspace.id, archivedAt: null }, data: { archivedAt: new Date() } });
  refresh(slug);
  return {};
}

export async function restoreLeaveTypeAction(slug: string, leaveTypeId: string): Promise<ActionResult> {
  const { workspace } = await requireAdmin(slug);
  const t = (await getMessages()).leaveTypes;
  const archived = await db.leaveType.findFirst({ where: { id: leaveTypeId, workspaceId: workspace.id, archivedAt: { not: null } } });
  if (!archived) return {};
  if ((await db.leaveType.count({ where: { workspaceId: workspace.id, archivedAt: null } })) >= MAX_TYPES) return { error: t.errors.tooMany };
  if (await nameTaken(workspace.id, archived.name)) return { error: t.errors.taken };
  await db.leaveType.update({ where: { id: archived.id }, data: { archivedAt: null } });
  refresh(slug);
  return {};
}
