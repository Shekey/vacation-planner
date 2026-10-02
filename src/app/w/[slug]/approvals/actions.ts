"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/action-form";
import { BookingError, decideBooking } from "@/lib/bookings";
import { actorOf, requireAdmin } from "@/lib/session";
import { appOrigin } from "@/lib/url";

export async function decideAction(
  slug: string,
  bookingId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdmin(slug);
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;
  try {
    await decideBooking({
      workspace: ctx.workspace,
      actor: actorOf(ctx),
      bookingId,
      approve: formData.get("decision") === "approve",
      note,
      origin: await appOrigin(),
    });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/w/${slug}`, "layout");
  return {};
}
