"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/action-form";
import { accountDeletionPlan, deleteAccount } from "@/lib/account";
import { db } from "@/lib/db";
import { getMessages } from "@/lib/i18n/server";
import { createPersonalToken, MAX_TOKENS_PER_PERSON } from "@/lib/personal-tokens";
import { isTokenDays } from "@/lib/personal-tokens-shared";
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

export type TokenResult = ActionResult & { token?: string };

/** Makes a personal token for an AI assistant (#45) in one of the caller's workspaces; the token is returned only now. */
export async function createAssistantTokenAction(_prev: TokenResult, formData: FormData): Promise<TokenResult> {
  const user = await requireUser();
  const t = (await getMessages()).assistant.errors;
  const name = String(formData.get("name") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 40) return { error: t.nameLength };
  const days = Number(formData.get("days"));
  if (!isTokenDays(days)) return { error: t.validFor };
  const membership = await db.membership.findFirst({
    where: { id: String(formData.get("membershipId") ?? ""), userId: user.id, removedAt: null, isSample: false, workspace: { deletedAt: null } },
    include: { workspace: { select: { settings: { select: { assistantAccess: true } } } } },
  });
  if (!membership) return { error: t.workspace };
  if (membership.workspace.settings && !membership.workspace.settings.assistantAccess) return { error: t.turnedOff };
  const count = await db.personalToken.count({ where: { membership: { userId: user.id } } });
  if (count >= MAX_TOKENS_PER_PERSON) return { error: t.tooMany(count) };
  const { token } = await createPersonalToken({ membershipId: membership.id, name, days });
  revalidatePath("/account");
  return { token };
}

/** Deletes one of the caller's tokens; assistants using it are refused from the next call on. */
export async function revokeAssistantTokenAction(tokenId: string): Promise<ActionResult> {
  const user = await requireUser();
  await db.personalToken.deleteMany({ where: { id: tokenId, membership: { userId: user.id } } });
  revalidatePath("/account");
  return { ok: (await getMessages()).assistant.revoked };
}
