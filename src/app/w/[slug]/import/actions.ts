"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consentState, consentUrl, directoryAvailable, directoryGroups, DirectoryError, isGroupId, peopleText as directoryText, type DirectoryGroup } from "@/lib/directory";
import { disconnectDirectory, loadDirectory } from "@/lib/directory-db";
import { applyPeople, applyTimeOff, MAX_IMPORT_ROWS, MAX_TIME_OFF_ROWS, planPeople, planTimeOff, type PeoplePlan, type TimeOffPlan } from "@/lib/import-db";
import { fetchSheet, sheetLink } from "@/lib/google-sheets";
import type { Messages } from "@/lib/i18n";
import { getMessages } from "@/lib/i18n/server";
import { accessOf } from "@/lib/plans";
import { requireAdmin, settingsOf } from "@/lib/session";
import { appOrigin } from "@/lib/url";

export type ImportKind = "people" | "timeoff";

export type PreviewResult = { error?: string; people?: PeoplePlan; timeOff?: TimeOffPlan };
export type ApplyResult = { error?: string; ok?: string };

/** Shows what an import would do, without saving anything. */
export async function previewImportAction(slug: string, kind: ImportKind, text: string): Promise<PreviewResult> {
  const { workspace } = await requireAdmin(slug);
  const t = (await getMessages()).importer;
  if (text.trim() === "") return { error: t.nothingToCheck };
  const settings = settingsOf(workspace);
  const plan = kind === "people" ? { people: await planPeople(workspace, settings, text) } : { timeOff: await planTimeOff(workspace, settings, text) };
  if (plan.people?.tooMany) return { error: t.errors.tooMany(MAX_IMPORT_ROWS) };
  if (plan.timeOff?.tooMany) return { error: t.errors.tooMany(MAX_TIME_OFF_ROWS) };
  return plan;
}

/** Saves an import. The text is read again here, so what is saved never depends on what the browser says the preview was. */
export async function applyImportAction(slug: string, kind: ImportKind, text: string, sendWelcome: boolean): Promise<ApplyResult> {
  const { workspace, user } = await requireAdmin(slug);
  const t = (await getMessages()).importer;
  const settings = settingsOf(workspace);

  if (kind === "people") {
    const result = await applyPeople(workspace, settings, user, text, { sendWelcome, origin: await appOrigin() });
    if ("error" in result) {
      if (result.error === "tooMany") return { error: t.errors.tooMany(MAX_IMPORT_ROWS) };
      if (result.error === "nothing") return { error: t.doneNothing };
      if (result.error === "mailLimit") return { error: t.errors.mailLimit(result.left) };
      const plan = await planPeople(workspace, settings, text);
      const access = accessOf(workspace);
      const name = access.kind === "trial" ? (await getMessages()).errors.trial : access.name;
      return { error: t.errors.limit(name, plan.room.max, plan.room.current, plan.counts.new) };
    }
    revalidatePath(`/w/${slug}`, "layout");
    return { ok: t.donePeople(result.created, result.emailed, result.emailFailed) };
  }

  const result = await applyTimeOff(workspace, settings, user, text);
  if ("error" in result) {
    if (result.error === "tooMany") return { error: t.errors.tooMany(MAX_TIME_OFF_ROWS) };
    if (result.error === "overLimit") return { error: t.errors.overLimit };
    if (result.error === "conflict") return { error: t.errors.conflict };
    return { error: t.doneNothing };
  }
  revalidatePath(`/w/${slug}`, "layout");
  return { ok: t.doneTimeOff(result.created, result.days) };
}

/** Loads a Google Sheets tab shared by link (#56). Only the sheet's CSV export on docs.google.com is fetched. */
export async function loadSheetAction(slug: string, link: string): Promise<{ error?: string; text?: string }> {
  await requireAdmin(slug);
  const t = (await getMessages()).importer;
  const sheet = sheetLink(link);
  if (!sheet) return { error: t.sheetLinkErrors.notSheetsLink };
  const result = await fetchSheet(sheet);
  if ("error" in result) return { error: t.sheetLinkErrors[result.error] };
  if (result.text.trim() === "") return { error: t.sheetLinkErrors.empty };
  return { text: result.text };
}

export type DirectoryLoad = { error?: string; reconnect?: boolean; text?: string; count?: number; leavers?: { name: string | null; email: string }[] };

function directoryError(e: unknown, t: Messages["directory"]["errors"]): string {
  if (e instanceof DirectoryError) return t[e.code];
  throw e;
}

/** Microsoft no longer lets the app in (the tenant's admin took the consent back): connecting again fixes it. */
const needsReconnect = (e: unknown) => e instanceof DirectoryError && e.code === "consentMissing";

/** Sends the admin to Microsoft to approve read-only access to the user list (#57). */
export async function connectDirectoryAction(slug: string): Promise<{ error?: string }> {
  const { membership, workspace } = await requireAdmin(slug);
  if (!directoryAvailable()) return { error: (await getMessages()).directory.unavailable };
  redirect(consentUrl(await appOrigin(), consentState({ workspaceId: workspace.id, membershipId: membership.id })));
}

export async function disconnectDirectoryAction(slug: string): Promise<{ ok?: string }> {
  const { workspace, user } = await requireAdmin(slug);
  await disconnectDirectory(workspace.id, user.id);
  revalidatePath(`/w/${slug}/import`);
  return { ok: (await getMessages()).directory.disconnected };
}

/** The organisation's groups, to pick who belongs in the workspace. */
export async function directoryGroupsAction(slug: string): Promise<{ error?: string; reconnect?: boolean; groups?: DirectoryGroup[] }> {
  const { workspace } = await requireAdmin(slug);
  const t = (await getMessages()).directory.errors;
  const tenant = workspace.settings?.directoryTenantId;
  if (!tenant) return { error: t.notConnected };
  try {
    return { groups: await directoryGroups(tenant) };
  } catch (e) {
    return { error: directoryError(e, t), reconnect: needsReconnect(e) };
  }
}

/** Loads the people of Microsoft 365 (everyone or one group) into the importer, and who is no longer there. */
export async function loadDirectoryAction(slug: string, groupId: string | null, groupName: string | null): Promise<DirectoryLoad> {
  const { workspace } = await requireAdmin(slug);
  const t = (await getMessages()).directory.errors;
  if (groupId !== null && !isGroupId(groupId)) return { error: t.group };
  try {
    const { people, changes } = await loadDirectory(workspace.id, { groupId, groupName });
    return { text: directoryText(people), count: people.length, leavers: changes.leavers.map(({ name, email }) => ({ name, email })) };
  } catch (e) {
    return { error: directoryError(e, t), reconnect: needsReconnect(e) };
  }
}
