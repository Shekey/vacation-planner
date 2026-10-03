"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/action-form";
import { normalizeWorkDays } from "@/lib/booking-days";
import { fromISO, isISODate } from "@/lib/dates";
import { db } from "@/lib/db";
import { isHolidayRegion } from "@/lib/holiday-regions";
import { getMessages } from "@/lib/i18n/server";
import { inviteMembers, parseEmailList, resendInvitation } from "@/lib/invitations";
import { accessOf } from "@/lib/plans";
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
  const t = (await getMessages()).members;
  const { valid, invalid } = parseEmailList(String(formData.get("emails") ?? ""));
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "MEMBER";
  if (invalid.length) return { error: t.errors.invalidEmail(invalid.join(", ")) };
  if (valid.length === 0) return { error: t.errors.noEmail };
  if (valid.length > 50) return { error: t.errors.tooMany };

  // People already in, plus invitations still open, plus these must fit the plan.
  const access = accessOf(invite.workspace);
  const [members, open] = await Promise.all([
    db.membership.count({ where: { workspaceId: invite.workspace.id, removedAt: null } }),
    db.invitation.count({
      where: { workspaceId: invite.workspace.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() }, email: { notIn: valid } },
    }),
  ]);
  if (members + open + valid.length > access.maxMembers) {
    const room = Math.max(0, access.maxMembers - members - open);
    return { error: t.errors.planLimit(access.name, access.maxMembers, room, open) };
  }

  const { invited, alreadyMembers, failed } = await inviteMembers(valid, role, invite);
  revalidatePath(`/w/${slug}/members`);
  const parts = [];
  const sent = invited.length - failed.length;
  if (sent) parts.push(t.invited(sent));
  if (alreadyMembers.length) parts.push(t.alreadyMembers(alreadyMembers.join(", ")));
  if (failed.length) {
    parts.push(t.errors.emailFailedTo(failed.map((f) => f.email).join(", "), failed[0].error));
    return { error: parts.join(" ") };
  }
  return { ok: parts.join(" ") };
}

export async function resendInviteAction(slug: string, invitationId: string): Promise<ActionResult> {
  const { invite } = await inviteContext(slug);
  const t = (await getMessages()).members;
  const sent = await resendInvitation(invitationId, invite);
  revalidatePath(`/w/${slug}/members`);
  if (!sent) return { error: t.errors.notPending };
  return sent.ok ? { ok: t.sentAgain } : { error: t.errors.emailFailed(sent.error) };
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
  const t = (await getMessages()).members;
  const member = await db.membership.findFirst({
    where: { id: membershipId, workspaceId: ctx.workspace.id, removedAt: null },
  });
  if (!member) return { error: t.errors.memberNotFound };

  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "MEMBER";
  if (role === "MEMBER" && member.role === "ADMIN" && (await wouldRemoveLastAdmin(ctx.workspace.id, member.id))) {
    return { error: t.errors.lastAdmin };
  }

  const rawAllowance = String(formData.get("allowance") ?? "").trim();
  let allowance: number | null = null;
  if (rawAllowance !== "") {
    allowance = Number(rawAllowance);
    if (!Number.isFinite(allowance) || allowance < 0 || allowance > 365 || (allowance * 2) % 1 !== 0) {
      return { error: t.errors.allowance };
    }
  }

  // Only sent when the workspace has regions to pick from; "" means the workspace default.
  const region = formData.get("region");
  let holidayRegion = member.holidayRegion;
  if (typeof region === "string") {
    const country = ctx.workspace.settings?.holidayCountry ?? "";
    if (region && !isHolidayRegion(country, region)) return { error: t.errors.region };
    holidayRegion = region || null;
  }

  let workDays = member.workDays;
  if (formData.has("workDays") || formData.has("employmentStart")) {
    const picked = formData.getAll("workDays").map(Number);
    if (picked.length === 0) return { error: t.errors.workDays };
    workDays = normalizeWorkDays(picked, ctx.workspace.settings?.countWeekends ?? false);
  }

  let employmentStart = member.employmentStart;
  const rawStart = formData.get("employmentStart");
  if (typeof rawStart === "string") {
    if (rawStart && !isISODate(rawStart)) return { error: t.errors.startDate };
    employmentStart = rawStart ? fromISO(rawStart) : null;
  }

  await db.membership.update({
    where: { id: member.id },
    data: { role, annualAllowanceDays: allowance, holidayRegion, workDays, employmentStart },
  });
  revalidatePath(`/w/${slug}`, "layout");
  return { ok: t.saved };
}

export async function removeMemberAction(slug: string, membershipId: string): Promise<ActionResult> {
  const { ctx } = await inviteContext(slug);
  const t = (await getMessages()).members;
  const member = await db.membership.findFirst({
    where: { id: membershipId, workspaceId: ctx.workspace.id, removedAt: null },
  });
  if (!member) return { error: t.errors.memberNotFound };
  if (member.role === "ADMIN" && (await wouldRemoveLastAdmin(ctx.workspace.id, member.id))) {
    return { error: t.errors.lastAdmin };
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
