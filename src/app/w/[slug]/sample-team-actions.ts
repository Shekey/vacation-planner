"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/action-form";
import { getMessages } from "@/lib/i18n/server";
import { addSampleTeam, removeSampleTeam } from "@/lib/sample-team-db";
import { requireAdmin, settingsOf } from "@/lib/session";

export async function addSampleTeamAction(slug: string): Promise<ActionResult> {
  const { workspace, user } = await requireAdmin(slug);
  const t = (await getMessages()).members.sample;
  if (!(await addSampleTeam(workspace, settingsOf(workspace), user.id))) return { error: t.alreadyThere };
  revalidatePath(`/w/${slug}`, "layout");
  return { ok: t.added };
}

export async function removeSampleTeamAction(slug: string): Promise<ActionResult> {
  const { workspace } = await requireAdmin(slug);
  await removeSampleTeam([workspace.id]);
  revalidatePath(`/w/${slug}`, "layout");
  return { ok: (await getMessages()).members.sample.removed };
}
