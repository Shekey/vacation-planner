import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
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
