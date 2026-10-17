import { loadHolidays, type Settings } from "@/lib/bookings";
import { todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { SAMPLE_EMAIL_DOMAIN, sampleBookingRows, sampleBookings, sampleEmail, samplePeople } from "@/lib/sample-team";

/**
 * Adds six sample people with bookings over the next six weeks. Returns false when the workspace
 * already has a sample team. `actorId` is the admin, recorded as creator (and approver) of the bookings.
 */
export async function addSampleTeam(
  workspace: { id: string; timezone: string; settings: { teamType: string | null; defaultAllowanceDays: unknown } | null },
  settings: Settings,
  actorId: string,
) {
  if (await db.membership.count({ where: { workspaceId: workspace.id, isSample: true } })) return false;
  const allowance = workspace.settings?.defaultAllowanceDays == null ? null : Number(workspace.settings.defaultAllowanceDays);
  const names = samplePeople(workspace.settings?.teamType, settings.locale ?? "en");
  const holidays = await loadHolidays(workspace.id, settings.holidayRegion ?? "");
  const bookings = sampleBookings(todayIn(workspace.timezone), settings);

  await db.$transaction(async (tx) => {
    const memberships = [];
    for (const name of names) {
      const user = await tx.user.create({
        data: {
          name,
          email: sampleEmail(),
          memberships: { create: { workspaceId: workspace.id, isSample: true, annualAllowanceDays: allowance } },
        },
        select: { memberships: { select: { id: true } } },
      });
      memberships.push(user.memberships[0].id);
    }
    await tx.booking.createMany({
      data: sampleBookingRows(bookings, memberships, { ...settings, holidays }).map((r) => ({
        ...r,
        workspaceId: workspace.id,
        createdById: actorId,
        ...(r.status === "APPROVED" && settings.approvalsEnabled ? { decidedById: actorId, decidedAt: new Date() } : {}),
      })),
    });
  });
  return true;
}

/**
 * Deletes the sample people of these workspaces: their placeholder users, memberships and bookings
 * (both cascade). Real members and their data are untouched. Call before deleting a workspace,
 * since the workspace's cascade would leave the placeholder users behind.
 */
export async function removeSampleTeam(workspaceIds: string[]) {
  if (workspaceIds.length === 0) return 0;
  const { count } = await db.user.deleteMany({
    where: {
      email: { endsWith: `@${SAMPLE_EMAIL_DOMAIN}` },
      memberships: { some: { workspaceId: { in: workspaceIds }, isSample: true } },
    },
  });
  return count;
}
