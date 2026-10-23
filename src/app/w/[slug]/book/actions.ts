"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResult } from "@/components/action-form";
import { BookingError, cancelBooking, createBooking, restoreBooking, updateBooking } from "@/lib/bookings";
import { isISODate } from "@/lib/dates";
import { getMessages } from "@/lib/i18n/server";
import { actorOf, requireMembership, settingsOf } from "@/lib/session";
import { appOrigin } from "@/lib/url";

const schema = z.object({
  membershipId: z.string().min(1),
  // A built-in type, or "lt:<id>" for one of the admin's own leave types (#34).
  type: z.union([z.enum(["VACATION", "SICK", "SPECIAL", "OTHER"]), z.string().regex(/^lt:[\w-]+$/)]),
  // "" when the person doesn't say.
  specialReason: z.enum(["WEDDING", "BIRTH", "BEREAVEMENT", "MOVING", "OTHER", ""]).optional(),
  start: z.string().refine(isISODate),
  end: z.string().refine(isISODate),
  startPart: z.enum(["FULL", "PM"]),
  endPart: z.enum(["FULL", "AM"]),
  // "" for no stand-in.
  standInId: z.string().optional(),
});

export async function saveBooking(slug: string, bookingId: string | null, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireMembership(slug);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const t = (await getMessages()).book;
    const field = parsed.error.issues[0].path[0];
    return { error: field === "start" ? t.pickStart : field === "end" ? t.pickEnd : t.invalid };
  }
  // Bookings carry no free text, so nothing personal ends up in notes (and no diagnosis next to sick days).
  const { membershipId, specialReason, standInId, type, ...rest } = parsed.data;
  const leaveTypeId = type.startsWith("lt:") ? type.slice(3) : null;
  // A leave type's own built-in type is set from it in createBooking and updateBooking.
  const builtIn = leaveTypeId ? "OTHER" : (type as "VACATION" | "SICK" | "SPECIAL" | "OTHER");
  const input = { ...rest, type: builtIn, leaveTypeId, specialReason: specialReason || null, standInId: standInId || null, note: null };
  const common = {
    workspace: ctx.workspace,
    settings: settingsOf(ctx.workspace),
    actor: actorOf(ctx),
    input,
    origin: await appOrigin(),
  };

  try {
    if (bookingId) await updateBooking({ ...common, bookingId });
    else await createBooking({ ...common, membershipId });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/w/${slug}`, "layout");
  redirect(membershipId === ctx.membership.id ? `/w/${slug}/me` : `/w/${slug}/calendar?month=${input.start.slice(0, 7)}`);
}

export async function cancelBookingAction(slug: string, bookingId: string): Promise<ActionResult> {
  const ctx = await requireMembership(slug);
  try {
    await cancelBooking({ workspaceId: ctx.workspace.id, actor: actorOf(ctx), bookingId });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/w/${slug}`, "layout");
  return { ok: (await getMessages()).book.cancelled };
}

export async function restoreBookingAction(slug: string, bookingId: string): Promise<ActionResult> {
  const ctx = await requireMembership(slug);
  try {
    await restoreBooking({ workspace: ctx.workspace, settings: settingsOf(ctx.workspace), actor: actorOf(ctx), bookingId });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/w/${slug}`, "layout");
  return { ok: (await getMessages()).book.restored };
}
