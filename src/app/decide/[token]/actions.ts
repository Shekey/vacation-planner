"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/action-form";
import { loadApproveLink } from "@/lib/approve-link-db";
import { BookingError, decideBooking } from "@/lib/bookings";
import { getMessages } from "@/lib/i18n/server";
import { settingsOf } from "@/lib/session";
import { appOrigin } from "@/lib/url";

/** The button on the page an approve link opens. The token is checked again here, not taken from the page. */
export async function decideByLinkAction(token: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await loadApproveLink(token);
  const t = (await getMessages()).approvals.link;
  if (ctx.status !== "ok") return { error: ctx.status === "notAdmin" ? t.notAdmin : t.broken };
  const note =
    String(formData.get("note") ?? "")
      .trim()
      .slice(0, 500) || null;
  try {
    // Same path as the Approvals page, so the email to the person, the activity log and the chat post stay the same.
    await decideBooking({
      workspace: ctx.workspace,
      settings: settingsOf(ctx.workspace),
      actor: { userId: ctx.admin.userId, membershipId: ctx.admin.id, role: ctx.admin.role },
      bookingId: ctx.bookingId,
      approve: formData.get("decision") === "approve",
      note,
      origin: await appOrigin(),
    });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/w/${ctx.workspace.slug}`, "layout");
  revalidatePath(`/decide/${token}`);
  return {};
}
