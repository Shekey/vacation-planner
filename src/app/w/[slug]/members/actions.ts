"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/action-form";
import { normalizeWorkDays } from "@/lib/booking-days";
import { keepLastYearsAllowance } from "@/lib/bookings";
import { fromISO, isISODate, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { isHolidayRegion } from "@/lib/holiday-regions";
import { isLocale, messagesFor } from "@/lib/i18n";
import { getMessages } from "@/lib/i18n/server";
import { isEmail } from "@/lib/import";
import { sendEmail } from "@/lib/email";
import { isPlaceholderEmail } from "@/lib/no-email";
import { addWithoutEmail, attachEmail } from "@/lib/no-email-members";
import { inviteMembers, parseEmailList, resendInvitation } from "@/lib/invitations";
import { recordAudit } from "@/lib/audit";
import { accessOf } from "@/lib/plans";
import { restoreMember } from "@/lib/restore";
import { MEMBER_REMOVED } from "@/lib/undo";
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
    db.membership.count({ where: { workspaceId: invite.workspace.id, removedAt: null, isSample: false } }),
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

/** Adds someone who has no email address, by name; admins book their time off. */
export async function addWithoutEmailAction(slug: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { ctx } = await inviteContext(slug);
  const t = (await getMessages()).members;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: t.noEmail.errors.name };
  if (name.length > 100) return { error: t.noEmail.errors.nameLong };

  const access = accessOf(ctx.workspace);
  const members = await db.membership.count({ where: { workspaceId: ctx.workspace.id, removedAt: null, isSample: false } });
  if (members + 1 > access.maxMembers) return { error: t.errors.planLimit(access.name, access.maxMembers, 0, 0) };

  const allowance = ctx.workspace.settings?.defaultAllowanceDays;
  await addWithoutEmail(ctx.workspace, ctx.user.id, { name, annualAllowanceDays: allowance == null ? null : Number(allowance) });
  revalidatePath(`/w/${slug}`, "layout");
  return { ok: t.noEmail.added(name) };
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
    where: { workspaceId, role: "ADMIN", removedAt: null, isSample: false },
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
    include: { user: { select: { email: true } } },
  });
  if (!member) return { error: t.errors.memberNotFound };

  // Sample people and people without email can't sign in, so they never become admins.
  const role = formData.get("role") === "ADMIN" && !isPlaceholderEmail(member.user.email) ? "ADMIN" : "MEMBER";
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

  // Only sent for someone added without email: their real address, once they have one.
  const rawEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  if (rawEmail && (!isEmail(rawEmail) || isPlaceholderEmail(rawEmail))) return { error: t.errors.invalidEmail(rawEmail) };

  // Only sent from the "Work days · start date" section; empty means "calculate from bookings".
  const rawCarried = formData.get("carriedOver");
  let carried: number | null | undefined;
  if (typeof rawCarried === "string") {
    carried = rawCarried.trim() === "" ? null : Number(rawCarried.replace(",", "."));
    if (carried !== null && (!Number.isFinite(carried) || carried < 0 || carried > 365 || (carried * 2) % 1 !== 0)) {
      return { error: t.errors.carriedOver };
    }
  }

  const year = Number(todayIn(ctx.workspace.timezone).slice(0, 4));
  // Sent next to "carriedOver" when the workspace has a deadline; an unticked box isn't sent at all.
  if (typeof rawCarried === "string" && formData.has("keepCarriedShown")) {
    const where = { membershipId_year: { membershipId: member.id, year } };
    if (formData.get("keepCarried") === "on") {
      await db.keepCarriedOver.upsert({ where, create: { membershipId: member.id, year }, update: {} });
    } else await db.keepCarriedOver.deleteMany({ where: { membershipId: member.id, year } });
  }
  await keepLastYearsAllowance([member], allowance, year);
  if (carried === null) await db.carriedOver.deleteMany({ where: { membershipId: member.id, year } });
  else if (carried !== undefined) {
    await db.carriedOver.upsert({
      where: { membershipId_year: { membershipId: member.id, year } },
      create: { membershipId: member.id, year, days: carried },
      update: { days: carried },
    });
  }
  await db.membership.update({
    where: { id: member.id },
    data: { role, annualAllowanceDays: allowance, holidayRegion, workDays, employmentStart },
  });
  if (role !== member.role) {
    const who = await db.user.findUniqueOrThrow({ where: { id: member.userId }, select: { name: true, email: true } });
    await recordAudit({
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      action: "member.role_changed",
      targetLabel: who.name ?? who.email,
      detail: role,
    });
  }
  if (rawEmail) {
    const attached = await attachEmail(member, rawEmail, ctx.user.id);
    if ("error" in attached) return { error: t.noEmail.errors.inUse(rawEmail) };
    // Tell them where to sign in, in their language if they already use the app, else the workspace's.
    const user = await db.user.findUniqueOrThrow({ where: { email: rawEmail }, select: { locale: true } });
    const locale = isLocale(user.locale) ? user.locale : isLocale(ctx.workspace.settings?.locale) ? ctx.workspace.settings.locale : "en";
    const welcome = messagesFor(locale).email.welcome;
    const sent = await sendEmail({
      to: rawEmail,
      subject: welcome.subject(ctx.workspace.name),
      text: welcome.text(ctx.workspace.name, `${await appOrigin()}/sign-in`),
    });
    revalidatePath(`/w/${slug}`, "layout");
    return sent.ok ? { ok: t.noEmail.emailAdded(rawEmail) } : { error: t.errors.emailFailedTo(rawEmail, sent.error) };
  }
  revalidatePath(`/w/${slug}`, "layout");
  return { ok: t.saved };
}

export async function removeMemberAction(slug: string, membershipId: string): Promise<ActionResult> {
  const { ctx } = await inviteContext(slug);
  const t = (await getMessages()).members;
  const member = await db.membership.findFirst({
    where: { id: membershipId, workspaceId: ctx.workspace.id, removedAt: null },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!member) return { error: t.errors.memberNotFound };
  if (member.role === "ADMIN" && (await wouldRemoveLastAdmin(ctx.workspace.id, member.id))) {
    return { error: t.errors.lastAdmin };
  }
  const now = new Date();
  await db.$transaction([
    db.membership.update({ where: { id: member.id }, data: { removedAt: now } }),
    // Their future plans no longer apply; history stays. They are marked so "Restore" brings them back as they were.
    ...(["PENDING", "APPROVED"] as const).map((status) =>
      db.booking.updateMany({
        where: { membershipId: member.id, status, startDate: { gt: now } },
        data: { status: "CANCELLED", cancelledAt: now, cancelledFrom: status, cancelReason: MEMBER_REMOVED },
      }),
    ),
  ]);
  await recordAudit({
    workspaceId: ctx.workspace.id,
    actorId: ctx.user.id,
    action: "member.removed",
    targetLabel: member.user.name ?? member.user.email,
  });
  revalidatePath(`/w/${slug}`, "layout");
  return {};
}

export async function restoreMemberAction(slug: string, membershipId: string): Promise<ActionResult> {
  const { ctx } = await inviteContext(slug);
  const t = (await getMessages()).members;
  const result = await restoreMember(ctx.workspace, membershipId, ctx.user.id);
  if (!result.ok) {
    return {
      error:
        result.reason === "limit"
          ? t.errors.restoreLimit(accessOf(ctx.workspace).name, result.max ?? 0)
          : result.reason === "expired"
            ? t.errors.restoreExpired
            : t.errors.memberNotFound,
    };
  }
  revalidatePath(`/w/${slug}`, "layout");
  return { ok: t.restored(result.bookings, result.skipped) };
}
