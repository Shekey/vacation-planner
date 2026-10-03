"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/action-form";
import { normalizeWorkDays } from "@/lib/booking-days";
import { fromISO, isISODate } from "@/lib/dates";
import { db } from "@/lib/db";
import { isHolidayRegion } from "@/lib/holiday-regions";
import { inviteMembers, parseEmailList, resendInvitation } from "@/lib/invitations";
import { requireAdmin } from "@/lib/session";
import { appOrigin } from "@/lib/url";

async function inviteContext(slug: string) {
  const ctx = await requireAdmin(slug);
  return {
    ctx,
    invite: {
      workspace: ctx.workspace,
      invitedBy: { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email },
      origin: await appOrigin(),
    },
  };
}

export async function inviteAction(slug: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { invite } = await inviteContext(slug);
  const { valid, invalid } = parseEmailList(String(formData.get("emails") ?? ""));
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "MEMBER";
  if (invalid.length) return { error: `Not a valid email: ${invalid.join(", ")}` };
  if (valid.length === 0) return { error: "Enter at least one email." };
  if (valid.length > 50) return { error: "Invite at most 50 people at a time." };

  const { invited, alreadyMembers, failed } = await inviteMembers(valid, role, invite);
  revalidatePath(`/w/${slug}/members`);
  const parts = [];
  const sent = invited.length - failed.length;
  if (sent) parts.push(`Invited ${sent} ${sent === 1 ? "person" : "people"}.`);
  if (alreadyMembers.length) parts.push(`Already members: ${alreadyMembers.join(", ")}.`);
  if (failed.length) {
    parts.push(`The email didn't go out to ${failed.map((f) => f.email).join(", ")}: ${failed[0].error}`);
    return { error: parts.join(" ") };
  }
  return { ok: parts.join(" ") };
}

export async function resendInviteAction(slug: string, invitationId: string): Promise<ActionResult> {
  const { invite } = await inviteContext(slug);
  const sent = await resendInvitation(invitationId, invite);
  revalidatePath(`/w/${slug}/members`);
  if (!sent) return { error: "That invitation is no longer pending." };
  return sent.ok ? { ok: "Sent again." } : { error: `The email didn't go out: ${sent.error}` };
}

export async function revokeInviteAction(slug: string, invitationId: string): Promise<ActionResult> {
  const { ctx } = await inviteContext(slug);
  await db.invitation.updateMany({
    where: { id: invitationId, workspaceId: ctx.workspace.id, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  revalidatePath(`/w/${slug}/members`);
  return {};
}

/** Admin-only changes must never leave a workspace without an admin. */
async function wouldRemoveLastAdmin(workspaceId: string, membershipId: string) {
  const admins = await db.membership.findMany({
    where: { workspaceId, role: "ADMIN", removedAt: null },
    select: { id: true },
  });
  return admins.length === 1 && admins[0].id === membershipId;
}

export async function updateMemberAction(
  slug: string,
  membershipId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx } = await inviteContext(slug);
  const member = await db.membership.findFirst({
    where: { id: membershipId, workspaceId: ctx.workspace.id, removedAt: null },
  });
  if (!member) return { error: "Member not found." };

  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "MEMBER";
  if (role === "MEMBER" && member.role === "ADMIN" && (await wouldRemoveLastAdmin(ctx.workspace.id, member.id))) {
    return { error: "A workspace needs at least one admin." };
  }

  const rawAllowance = String(formData.get("allowance") ?? "").trim();
  let allowance: number | null = null;
  if (rawAllowance !== "") {
    allowance = Number(rawAllowance);
    if (!Number.isFinite(allowance) || allowance < 0 || allowance > 365 || (allowance * 2) % 1 !== 0) {
      return { error: "Allowance must be between 0 and 365, in half days." };
    }
  }

  // Only sent when the workspace has regions to pick from; "" means the workspace default.
  const region = formData.get("region");
  let holidayRegion = member.holidayRegion;
  if (typeof region === "string") {
    const country = ctx.workspace.settings?.holidayCountry ?? "";
    if (region && !isHolidayRegion(country, region)) return { error: "Pick a region from the list." };
    holidayRegion = region || null;
  }

  let workDays = member.workDays;
  if (formData.has("workDays") || formData.has("employmentStart")) {
    const picked = formData.getAll("workDays").map(Number);
    if (picked.length === 0) return { error: "Pick at least one work day." };
    workDays = normalizeWorkDays(picked, ctx.workspace.settings?.countWeekends ?? false);
  }

  let employmentStart = member.employmentStart;
  const rawStart = formData.get("employmentStart");
  if (typeof rawStart === "string") {
    if (rawStart && !isISODate(rawStart)) return { error: "Enter a valid start date." };
    employmentStart = rawStart ? fromISO(rawStart) : null;
  }

  await db.membership.update({
    where: { id: member.id },
    data: { role, annualAllowanceDays: allowance, holidayRegion, workDays, employmentStart },
  });
  revalidatePath(`/w/${slug}`, "layout");
  return { ok: "Saved." };
}

export async function removeMemberAction(slug: string, membershipId: string): Promise<ActionResult> {
  const { ctx } = await inviteContext(slug);
  const member = await db.membership.findFirst({
    where: { id: membershipId, workspaceId: ctx.workspace.id, removedAt: null },
  });
  if (!member) return { error: "Member not found." };
  if (member.role === "ADMIN" && (await wouldRemoveLastAdmin(ctx.workspace.id, member.id))) {
    return { error: "A workspace needs at least one admin." };
  }
  await db.$transaction([
    db.membership.update({ where: { id: member.id }, data: { removedAt: new Date() } }),
    // Their future plans no longer apply; history stays.
    db.booking.updateMany({
      where: { membershipId: member.id, status: { in: ["PENDING", "APPROVED"] }, startDate: { gt: new Date() } },
      data: { status: "CANCELLED" },
    }),
  ]);
  revalidatePath(`/w/${slug}`, "layout");
  return {};
}
