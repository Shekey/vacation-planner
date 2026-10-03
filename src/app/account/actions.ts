"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/action-form";
import { accountDeletionPlan, deleteAccount } from "@/lib/account";
import { db } from "@/lib/db";
import { getMessages } from "@/lib/i18n/server";
import { safeRedirectPath } from "@/lib/security";
import { requireUser } from "@/lib/session";

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
