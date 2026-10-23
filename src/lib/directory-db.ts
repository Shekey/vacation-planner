import { recordAudit } from "@/lib/audit";
import { forEachWithin } from "@/lib/cron";
import { db } from "@/lib/db";
import {
  changesKey,
  directoryChanges,
  directoryPeople,
  DirectoryError,
  isGroupId,
  isTenantId,
  isTenantMember,
  readConsentState,
  type DirectoryChanges,
  type DirectoryPerson,
} from "@/lib/directory";
import { sendEmail } from "@/lib/email";
import { isLocale, messagesFor, type Locale } from "@/lib/i18n";
import { hasNoEmail } from "@/lib/no-email";
import { isSampleEmail } from "@/lib/sample-team";

export type ConnectResult = { slug: string | null; outcome: "connected" | "declined" | "expired" | "notMember" | "consentMissing" | "failed" };

/**
 * Microsoft's answer to the admin consent (#57). The tenant only counts when the state names this admin, Microsoft
 * says it was approved, the app can now read that tenant, and the admin's own email is an active account in it, so
 * nobody can point their workspace at another organisation's directory by changing the tenant in the address.
 */
export async function connectDirectory(opts: {
  state: string;
  tenant: string | null;
  approved: boolean;
  userId: string;
  now?: Date;
}): Promise<ConnectResult> {
  const state = readConsentState(opts.state, opts.now);
  if (!state) return { slug: null, outcome: "expired" };
  const membership = await db.membership.findFirst({
    where: { id: state.membershipId, workspaceId: state.workspaceId, userId: opts.userId, role: "ADMIN", removedAt: null, workspace: { deletedAt: null } },
    include: { user: { select: { email: true } }, workspace: { select: { slug: true } } },
  });
  if (!membership) return { slug: null, outcome: "expired" };
  const slug = membership.workspace.slug;
  if (!opts.approved) return { slug, outcome: "declined" };
  if (!isTenantId(opts.tenant)) return { slug, outcome: "failed" };

  try {
    if (!(await isTenantMember(opts.tenant, membership.user.email))) return { slug, outcome: "notMember" };
  } catch (e) {
    if (e instanceof DirectoryError) return { slug, outcome: e.code === "consentMissing" ? "consentMissing" : "failed" };
    throw e;
  }

  const data = { directoryTenantId: opts.tenant, directoryGroupId: null, directoryGroupName: null, directoryConnectedAt: opts.now ?? new Date(), directoryNoticeKey: null };
  await db.workspaceSettings.upsert({ where: { workspaceId: state.workspaceId }, create: { workspaceId: state.workspaceId, ...data }, update: data });
  await recordAudit({ workspaceId: state.workspaceId, actorId: opts.userId, action: "directory.connected" });
  return { slug, outcome: "connected" };
}

export async function disconnectDirectory(workspaceId: string, actorId: string) {
  await db.workspaceSettings.updateMany({
    where: { workspaceId },
    data: { directoryTenantId: null, directoryGroupId: null, directoryGroupName: null, directoryConnectedAt: null, directoryNoticeKey: null },
  });
  await recordAudit({ workspaceId, actorId, action: "directory.disconnected" });
}

async function membersOf(workspaceId: string) {
  const rows = await db.membership.findMany({
    where: { workspaceId, isSample: false },
    select: { id: true, removedAt: true, user: { select: { email: true, name: true } } },
  });
  return rows
    .filter((m) => !hasNoEmail(m.user.email) && !isSampleEmail(m.user.email))
    .map((m) => ({ id: m.id, email: m.user.email, name: m.user.name, removed: m.removedAt !== null }));
}

/**
 * The people of the chosen scope (everyone or one group), for the importer, plus who is no longer there. The scope is
 * remembered, so the nightly check compares with the same people.
 */
export async function loadDirectory(
  workspaceId: string,
  scope: { groupId: string | null; groupName: string | null },
): Promise<{ people: DirectoryPerson[]; changes: DirectoryChanges }> {
  const settings = await db.workspaceSettings.findUnique({ where: { workspaceId }, select: { directoryTenantId: true } });
  if (!settings?.directoryTenantId) throw new DirectoryError("notConnected");
  if (scope.groupId !== null && !isGroupId(scope.groupId)) throw new DirectoryError("failed");
  const people = await directoryPeople(settings.directoryTenantId, scope.groupId);
  const changes = directoryChanges(people, await membersOf(workspaceId));
  await db.workspaceSettings.update({
    where: { workspaceId },
    data: { directoryGroupId: scope.groupId, directoryGroupName: scope.groupId ? (scope.groupName?.slice(0, 200) ?? null) : null, directoryNoticeKey: changesKey(changes) },
  });
  return { people, changes };
}

const localeOf = (value: string | null | undefined, fallback: Locale): Locale => (isLocale(value) ? value : fallback);

/**
 * The nightly check: for each connected workspace, emails its admins the joiners and leavers once per change.
 * Nobody is added or removed here. A tenant that took the access back is skipped until an admin connects again.
 */
export async function notifyDirectoryChanges(origin: string) {
  const workspaces = await db.workspace.findMany({
    where: { deletedAt: null, settings: { directoryTenantId: { not: null } } },
    select: { id: true, name: true, slug: true, settings: { select: { directoryTenantId: true, directoryGroupId: true, directoryNoticeKey: true, locale: true } } },
  });
  let emailed = 0;
  const run = await forEachWithin(workspaces, async (ws) => {
    const s = ws.settings!;
    const people = await directoryPeople(s.directoryTenantId!, s.directoryGroupId);
    const changes = directoryChanges(people, await membersOf(ws.id));
    const key = changesKey(changes);
    if (key === s.directoryNoticeKey) return;
    await db.workspaceSettings.update({ where: { workspaceId: ws.id }, data: { directoryNoticeKey: key } });
    if (!key) return;

    const admins = await db.membership.findMany({
      where: { workspaceId: ws.id, role: "ADMIN", removedAt: null, isSample: false },
      select: { user: { select: { email: true, locale: true } } },
    });
    const fallback = localeOf(s.locale, "en");
    const label = (p: { name: string | null; email: string }) => (p.name ? `${p.name} <${p.email}>` : p.email);
    for (const admin of admins) {
      if (hasNoEmail(admin.user.email) || isSampleEmail(admin.user.email)) continue;
      const t = messagesFor(localeOf(admin.user.locale, fallback)).directory.email;
      await sendEmail({
        to: admin.user.email,
        subject: t.subject(ws.name),
        text: t.text({
          workspace: ws.name,
          joiners: changes.joiners.slice(0, 50).map(label),
          leavers: changes.leavers.slice(0, 50).map(label),
          importUrl: `${origin}/w/${ws.slug}/import?start=directory`,
          membersUrl: `${origin}/w/${ws.slug}/members`,
        }),
      });
      emailed++;
    }
  });
  return { ...run, emailed };
}
