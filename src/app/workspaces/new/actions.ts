"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { isHolidayCountry, isHolidayRegion } from "@/lib/holiday-regions";
import { importHolidays } from "@/lib/holiday-import";
import type { Messages } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { TEAM_TYPE_KEYS, TEAM_TYPES } from "@/lib/team-types";
import { createWorkspace } from "@/lib/workspaces";

function workspaceSchema(t: Messages["newWorkspace"]) {
  return z.object({
    name: z.string().trim().min(2, t.errors.nameLength).max(60),
    timezone: z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz) || tz === "UTC", {
      message: t.errors.timezone,
    }),
    teamType: z.enum(TEAM_TYPE_KEYS).catch("other"),
    allowance: z.coerce
      .number()
      .refine((n) => Number.isFinite(n) && n >= 0 && n <= 365 && (n * 2) % 1 === 0, t.errors.allowance),
    // "" skips the holiday import.
    country: z.string().trim().toUpperCase().default(""),
    region: z.string().default(""),
  });
}

export type CreateWorkspaceState = { error?: string };

export async function createWorkspaceAction(_prev: CreateWorkspaceState, formData: FormData): Promise<CreateWorkspaceState> {
  const user = await requireUser();
  const parsed = workspaceSchema((await getMessages()).newWorkspace).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, timezone, teamType, allowance, country, region } = parsed.data;
  const locale = await getLocale();

  // A German admin's team gets German Teams/Slack posts by default.
  const workspace = await createWorkspace({
    name,
    timezone,
    userId: user.id,
    locale,
    approvalsEnabled: TEAM_TYPES[teamType].approvals,
    allowanceDays: allowance,
  });

  // Public holidays right away, so the first booking already skips them. If the holiday service
  // is down the workspace still works and the getting-started checklist asks again.
  if (isHolidayCountry(country)) {
    const year = Number(todayIn(timezone).slice(0, 4));
    const results = await Promise.all([year, year + 1].map((y) => importHolidays(workspace.id, country, y, locale)));
    if (results.some((r) => !("error" in r))) {
      await db.workspaceSettings.update({
        where: { workspaceId: workspace.id },
        data: { holidayCountry: country, holidayRegion: isHolidayRegion(country, region) ? region : null },
      });
    }
  }
  redirect(`/w/${workspace.slug}`);
}
