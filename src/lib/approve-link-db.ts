import { readApproveToken } from "@/lib/approve-link";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";

export type ApproveLinkContext =
  | { status: "broken" }
  | { status: "notAdmin" }
  | {
      status: "ok";
      bookingId: string;
      admin: { id: string; userId: string; role: "ADMIN" | "MEMBER"; user: { email: string; name: string | null } };
      workspace: NonNullable<Awaited<ReturnType<typeof loadWorkspace>>>;
    };

function loadWorkspace(id: string) {
  return db.workspace.findFirst({ where: { id, deletedAt: null }, include: { settings: true } });
}

/**
 * Who an approve link decides as, checked again on every use: the admin must still be in the workspace, still allowed
 * to decide, and the workspace not deleted. The booking is looked up within that workspace only.
 */
export async function loadApproveLink(token: string): Promise<ApproveLinkContext> {
  const link = readApproveToken(token);
  if (!link) return { status: "broken" };
  const admin = await db.membership.findFirst({
    where: { id: link.membershipId, removedAt: null },
    select: { id: true, userId: true, role: true, workspaceId: true, user: { select: { email: true, name: true } } },
  });
  const workspace = admin ? await loadWorkspace(admin.workspaceId) : null;
  if (!admin || !workspace) return { status: "broken" };
  if (!can(admin.role, "bookings:decide")) return { status: "notAdmin" };
  return { status: "ok", bookingId: link.bookingId, admin, workspace };
}
