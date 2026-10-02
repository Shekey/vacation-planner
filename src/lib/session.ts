import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import type { Settings } from "@/lib/bookings";
import { db } from "@/lib/db";

/** The signed-in user, or a redirect to sign in. */
export const requireUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  return { id: session.user.id, email: session.user.email ?? "", name: session.user.name };
});

/**
 * The caller's active membership in the workspace with this slug.
 * Responds 404 when the workspace does not exist or the caller is not a member,
 * so workspaces can't be discovered by guessing slugs.
 */
export const requireMembership = cache(async (slug: string) => {
  const user = await requireUser();
  const membership = await db.membership.findFirst({
    where: { userId: user.id, removedAt: null, workspace: { slug } },
    include: { workspace: { include: { settings: true } } },
  });
  if (!membership) notFound();
  return { user, membership, workspace: membership.workspace };
});

/** Like requireMembership, but only for admins; members get a 404. */
export async function requireAdmin(slug: string) {
  const ctx = await requireMembership(slug);
  if (ctx.membership.role !== "ADMIN") notFound();
  return ctx;
}

type SettingsRow = {
  approvalsEnabled: boolean;
  countWeekends: boolean;
  allowHalfDays: boolean;
  maxCarryOverDays: { toString(): string } | null;
  minPeoplePresent: number | null;
  teamsWebhookUrl: string | null;
  holidayRegion: string | null;
};

export function settingsOf(workspace: { settings: SettingsRow | null }): Settings {
  const s = workspace.settings;
  return {
    approvalsEnabled: s?.approvalsEnabled ?? false,
    countWeekends: s?.countWeekends ?? false,
    allowHalfDays: s?.allowHalfDays ?? true,
    maxCarryOverDays: s?.maxCarryOverDays == null ? null : Number(s.maxCarryOverDays),
    minPeoplePresent: s?.minPeoplePresent ?? null,
    teamsWebhookUrl: s?.teamsWebhookUrl ?? null,
    holidayRegion: s?.holidayRegion ?? null,
  };
}

export function actorOf(ctx: { user: { id: string }; membership: { id: string; role: "ADMIN" | "MEMBER" } }) {
  return { userId: ctx.user.id, membershipId: ctx.membership.id, role: ctx.membership.role };
}
