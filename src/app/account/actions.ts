"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/action-form";
import { db } from "@/lib/db";
import { safeRedirectPath } from "@/lib/security";
import { requireUser } from "@/lib/session";

export async function saveNameAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 60) return { error: "Use 2 to 60 characters." };
  await db.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/", "layout");
  const next = safeRedirectPath(formData.get("next"), "");
  if (next) redirect(next);
  return { ok: "Saved." };
}
