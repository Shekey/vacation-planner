"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/action-form";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function dismissOnboardingAction(slug: string): Promise<ActionResult> {
  const { workspace } = await requireAdmin(slug);
  await db.workspaceSettings.upsert({
    where: { workspaceId: workspace.id },
    create: { workspaceId: workspace.id, onboardingDismissedAt: new Date() },
    update: { onboardingDismissedAt: new Date() },
  });
  revalidatePath(`/w/${slug}`);
  return {};
}
