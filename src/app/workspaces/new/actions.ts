"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { createWorkspace } from "@/lib/workspaces";

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  timezone: z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz) || tz === "UTC", {
    message: "Unknown timezone",
  }),
});

export type CreateWorkspaceState = { error?: string };

export async function createWorkspaceAction(
  _prev: CreateWorkspaceState,
  formData: FormData,
): Promise<CreateWorkspaceState> {
  const user = await requireUser();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const workspace = await createWorkspace({ ...parsed.data, userId: user.id });
  redirect(`/w/${workspace.slug}`);
}
