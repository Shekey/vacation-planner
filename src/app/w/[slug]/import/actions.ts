"use server";

import { revalidatePath } from "next/cache";
import { applyPeople, applyTimeOff, MAX_IMPORT_ROWS, MAX_TIME_OFF_ROWS, planPeople, planTimeOff, type PeoplePlan, type TimeOffPlan } from "@/lib/import-db";
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
