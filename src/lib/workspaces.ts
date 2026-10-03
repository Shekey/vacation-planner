import { db } from "@/lib/db";
import { TRIAL_DAYS } from "@/lib/plans";
import { uniqueSlug } from "@/lib/slug";

/** Creates a workspace with default settings and makes the creator its first admin. */
export async function createWorkspace(input: { name: string; timezone: string; userId: string; locale?: string }) {
  const slug = await uniqueSlug(input.name, async (s) =>
    Boolean(await db.workspace.findUnique({ where: { slug: s }, select: { id: true } })),
  );
  return db.workspace.create({
    data: {
      name: input.name,
      slug,
      timezone: input.timezone,
      createdById: input.userId,
      trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86_400_000),
      settings: { create: { locale: input.locale } },
      memberships: { create: { userId: input.userId, role: "ADMIN", annualAllowanceDays: 20 } },
    },
  });
}

export function listWorkspacesForUser(userId: string) {
  return db.membership.findMany({
    where: { userId, removedAt: null },
    include: { workspace: true },
    orderBy: { workspace: { name: "asc" } },
  });
}
