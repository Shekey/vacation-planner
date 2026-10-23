"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/action-form";
import { accountDeletionPlan, deleteAccount } from "@/lib/account";
import { db } from "@/lib/db";
import { getMessages } from "@/lib/i18n/server";
import { authorizeUrl, connectState, outlookAvailable } from "@/lib/outlook";
import { disconnectOutlook, stopAutoReply } from "@/lib/outlook-db";
import { safeRedirectPath } from "@/lib/security";
import { requireUser } from "@/lib/session";
import { appOrigin } from "@/lib/url";

export async function saveNameAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const t = (await getMessages()).account;
  const name = String(formData.get("name") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 60) return { error: t.errors.nameLength };
  await db.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/", "layout");
  const next = safeRedirectPath(formData.get("next"), "");
  if (next) redirect(next);
  return { ok: t.saved };
}

export async function deleteAccountAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const t = (await getMessages()).account;
  const typed = String(formData.get("confirmEmail") ?? "")
    .trim()
    .toLowerCase();
  if (typed !== user.email.toLowerCase()) return { error: t.errors.confirmEmail };
  const { blocked } = await accountDeletionPlan(user.id);
  if (blocked.length) {
    return { error: t.errors.onlyAdmin(blocked.map((w) => w.name).join(", ")) };
  }
  await deleteAccount(user.id);
  // The database session went with the account; drop the cookie that pointed at it.
  const jar = await cookies();
  for (const name of ["authjs.session-token", "__Secure-authjs.session-token"]) jar.delete(name);
  redirect("/");
}

/** Sends the person to Microsoft to allow access to their own calendar, and to their automatic reply if they ticked it (#35). */
export async function connectOutlookAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (!outlookAvailable()) return { error: (await getMessages()).outlook.unavailable };
  const autoReply = formData.get("autoReply") === "on";
  redirect(authorizeUrl(await appOrigin(), connectState({ userId: user.id, autoReply }), autoReply));
}

export async function stopAutoReplyAction(): Promise<ActionResult> {
  const user = await requireUser();
  await stopAutoReply(user.id);
  revalidatePath("/account");
  return { ok: (await getMessages()).outlook.autoReplyStopped };
}

export async function disconnectOutlookAction(): Promise<ActionResult> {
  const user = await requireUser();
  await disconnectOutlook(user.id);
  revalidatePath("/account");
  return { ok: (await getMessages()).outlook.disconnected };
}
