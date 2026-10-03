"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { Messages } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { createWorkspace } from "@/lib/workspaces";

function workspaceSchema(t: Messages["newWorkspace"]) {
  return z.object({
    name: z.string().trim().min(2, t.errors.nameLength).max(60),
    timezone: z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz) || tz === "UTC", {
      message: t.errors.timezone,
    }),
  });
}

export type CreateWorkspaceState = { error?: string };

export async function createWorkspaceAction(_prev: CreateWorkspaceState, formData: FormData): Promise<CreateWorkspaceState> {
  const user = await requireUser();
  const parsed = workspaceSchema((await getMessages()).newWorkspace).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // A German admin's team gets German Teams/Slack posts by default.
  const workspace = await createWorkspace({ ...parsed.data, userId: user.id, locale: await getLocale() });
  redirect(`/w/${workspace.slug}`);
}
