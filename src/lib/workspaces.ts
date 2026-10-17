import { db } from "@/lib/db";
import { TRIAL_DAYS } from "@/lib/plans";
import { uniqueSlug } from "@/lib/slug";
import { restoreCutoff } from "@/lib/undo";

/** Creates a workspace with default settings and makes the creator its first admin. */
export async function createWorkspace(input: {
  name: string;
  timezone: string;
  userId: string;
  locale?: string;
  approvalsEnabled?: boolean;
  /** Yearly allowance for new members, the creator included. */
  allowanceDays?: number;
  /** Kind of team picked at setup, for the sample team's names. */
  teamType?: string;
}) {
  const slug = await uniqueSlug(input.name, async (s) =>
    Boolean(await db.workspace.findUnique({ where: { slug: s }, select: { id: true } })),
  );
  const allowance = input.allowanceDays ?? 20;
  return db.workspace.create({
    data: {
      name: input.name,
      slug,
      timezone: input.timezone,
      createdById: input.userId,
      trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86_400_000),
      settings: {
        create: {
          locale: input.locale,
          approvalsEnabled: input.approvalsEnabled ?? false,
          defaultAllowanceDays: allowance,
          teamType: input.teamType,
        },
      },
      memberships: { create: { userId: input.userId, role: "ADMIN", annualAllowanceDays: allowance } },
    },
  });
}

export function listWorkspacesForUser(userId: string) {
  return db.membership.findMany({
    where: { userId, removedAt: null, workspace: { deletedAt: null } },
    include: { workspace: true },
    orderBy: { workspace: { name: "asc" } },
  });
}

/** Workspaces this person administers that were deleted less than RESTORE_DAYS ago, for the "Restore" list. */
export function listDeletedWorkspacesForAdmin(userId: string) {
  return db.workspace.findMany({
    where: { deletedAt: { gt: restoreCutoff() }, memberships: { some: { userId, role: "ADMIN", removedAt: null } } },
    select: { id: true, name: true, deletedAt: true },
    orderBy: { deletedAt: "desc" },
  });
}
