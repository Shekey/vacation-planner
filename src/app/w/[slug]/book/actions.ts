"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResult } from "@/components/action-form";
import { BookingError, cancelBooking, createBooking, updateBooking } from "@/lib/bookings";
import { isISODate } from "@/lib/dates";
import { actorOf, requireMembership, settingsOf } from "@/lib/session";
import { appOrigin } from "@/lib/url";

const schema = z.object({
  membershipId: z.string().min(1),
  type: z.enum(["VACATION", "SICK", "OTHER"]),
  start: z.string().refine(isISODate, "Pick a start date."),
  end: z.string().refine(isISODate, "Pick an end date."),
  startPart: z.enum(["FULL", "PM"]),
  endPart: z.enum(["FULL", "AM"]),
  note: z
    .string()
    .trim()
    .max(500)
    .transform((s) => s || null),
});

export async function saveBooking(
  slug: string,
  bookingId: string | null,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireMembership(slug);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { membershipId, ...input } = parsed.data;
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
  return { ok: "Cancelled." };
}
