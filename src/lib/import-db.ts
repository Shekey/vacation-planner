import { recordAudit } from "@/lib/audit";
import { countDays, validateSpan } from "@/lib/booking-days";
import { ACTIVE_STATUSES, isOverlapError, loadHolidays, regionOf, rulesFor, type Settings } from "@/lib/bookings";
import { fromISO, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { regionsOf } from "@/lib/holiday-regions";
import { isLocale, messagesFor, type Locale } from "@/lib/i18n";
import { parsePeople, parseTimeOff, spansConflict, type ImportError, type PersonRow, type TimeOffRow } from "@/lib/import";
import { accessOf, isOverLimit } from "@/lib/plans";

type Workspace = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  plan: Parameters<typeof accessOf>[0]["plan"];
  billingStatus: string | null;
  trialEndsAt: Date | null;
  settings: { defaultAllowanceDays: { toString(): string } | null; holidayCountry: string | null } | null;
};
type Actor = { id: string };

/** Most rows one import takes, so a wrong paste can't run for minutes. The biggest plan holds 75 people. */
export const MAX_IMPORT_ROWS = 300;

// ---------- people ----------

export type PeopleRow = PersonRow & { status: "new" | "exists" | "removed" | "error" };

export type PeoplePlan = {
  rows: PeopleRow[];
  counts: { new: number; exists: number; removed: number; errors: number };
  /** People now, how many the plan allows, and whether the new ones fit. */
  room: { current: number; max: number; fits: boolean };
  tooMany: boolean;
  /** A state column was given but the workspace has no holiday country yet. */
  regionIgnored: boolean;
};

export async function planPeople(workspace: Workspace, settings: Settings, text: string): Promise<PeoplePlan> {
  const country = workspace.settings?.holidayCountry ?? "";
  const names = (code: string) => [regionsOf(country, "en"), regionsOf(country, "de")].map((l) => l.find((r) => r.code === code)?.name ?? "");
  // Without a holiday country there are no states to match, so a state column is left out rather than failing every row.
  const regions = country ? regionsOf(country, "en").map((r) => ({ code: r.code, names: names(r.code) })) : null;
  const parsed = parsePeople(text, { countWeekends: settings.countWeekends, regions });
  const tooMany = parsed.length > MAX_IMPORT_ROWS;

  const emails = parsed.filter((r) => !r.error).map((r) => r.email);
  const [existing, current] = await Promise.all([
    db.membership.findMany({
      where: { workspaceId: workspace.id, isSample: false, user: { email: { in: emails } } },
      select: { removedAt: true, user: { select: { email: true } } },
    }),
    db.membership.count({ where: { workspaceId: workspace.id, removedAt: null, isSample: false } }),
  ]);
  const byEmail = new Map(existing.map((m) => [m.user.email, m]));

  const rows = parsed.slice(0, MAX_IMPORT_ROWS).map((r): PeopleRow => {
    if (r.error) return { ...r, status: "error" };
    const m = byEmail.get(r.email);
    return { ...r, status: m ? (m.removedAt ? "removed" : "exists") : "new" };
  });
  const counts = {
    new: rows.filter((r) => r.status === "new").length,
    exists: rows.filter((r) => r.status === "exists").length,
    removed: rows.filter((r) => r.status === "removed").length,
    errors: rows.filter((r) => r.status === "error").length,
  };
  const max = accessOf(workspace).maxMembers;
  return { rows, counts, room: { current, max, fits: current + counts.new <= max }, tooMany, regionIgnored: rows.some((r) => r.regionIgnored) };
}

export type PeopleResult = { created: number; emailed: number; emailFailed: number };

/** Creates the new people as members right away (no invitation to wait for), then optionally emails them where to sign in. */
export async function applyPeople(
  workspace: Workspace,
  settings: Settings,
  actor: Actor,
  text: string,
  opts: { sendWelcome: boolean; origin: string },
): Promise<PeopleResult | { error: "limit" | "tooMany" | "nothing" }> {
  const plan = await planPeople(workspace, settings, text);
  if (plan.tooMany) return { error: "tooMany" };
  if (!plan.room.fits) return { error: "limit" };
  const fresh = plan.rows.filter((r) => r.status === "new");
  if (fresh.length === 0) return { error: "nothing" };

  const defaultAllowance = workspace.settings?.defaultAllowanceDays == null ? null : Number(workspace.settings.defaultAllowanceDays);
  const users = await db.$transaction(async (tx) => {
    const made: { email: string; name: string | null; locale: string | null }[] = [];
    for (const r of fresh) {
      const user = await tx.user.upsert({
        where: { email: r.email },
        create: { email: r.email, name: r.name },
        // Someone who already uses the app elsewhere keeps their own name.
        update: {},
        select: { id: true, name: true, locale: true },
      });
      if (!user.name && r.name) await tx.user.update({ where: { id: user.id }, data: { name: r.name } });
      await tx.membership.upsert({
        where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
        create: {
          workspaceId: workspace.id,
          userId: user.id,
          role: r.role,
          annualAllowanceDays: r.allowance ?? defaultAllowance,
          workDays: r.workDays ?? [],
          employmentStart: r.employmentStart ? fromISO(r.employmentStart) : null,
          holidayRegion: r.region,
        },
        update: {},
      });
      made.push({ email: r.email, name: r.name ?? user.name, locale: user.locale });
    }
    return made;
  });

  await recordAudit({ workspaceId: workspace.id, actorId: actor.id, action: "import.people", detail: String(users.length) });

  let emailed = 0;
  let emailFailed = 0;
  if (opts.sendWelcome) {
    for (const u of users) {
      const locale: Locale = isLocale(u.locale) ? u.locale : (settings.locale ?? "en");
      const t = messagesFor(locale).email.welcome;
      const sent = await sendEmail({ to: u.email, subject: t.subject(workspace.name), text: t.text(workspace.name, `${opts.origin}/sign-in`) });
      if (sent.ok) emailed++;
      else emailFailed++;
    }
  }
  return { created: users.length, emailed, emailFailed };
}

// ---------- time off ----------

export type TimeOffPlanRow = TimeOffRow & { status: "ok" | "error"; daysCount: number; membershipId: string | null; who: string | null };

export type TimeOffPlan = {
  rows: TimeOffPlanRow[];
  counts: { ok: number; errors: number; days: number };
  tooMany: boolean;
  overLimit: boolean;
};

export async function planTimeOff(workspace: Workspace, settings: Settings, text: string, now = new Date()): Promise<TimeOffPlan> {
  const parsed = parseTimeOff(text);
  const tooMany = parsed.length > MAX_IMPORT_ROWS;
  const rows = parsed.slice(0, MAX_IMPORT_ROWS);
  const today = todayIn(workspace.timezone, now);
  const thisYear = Number(today.slice(0, 4));

  const emails = [...new Set(rows.filter((r) => !r.error).map((r) => r.email))];
  const members = await db.membership.findMany({
    where: { workspaceId: workspace.id, isSample: false, user: { email: { in: emails } } },
    include: { user: { select: { email: true, name: true } } },
  });
  const memberOf = new Map(members.map((m) => [m.user.email, m]));
  const dated = rows.filter((r) => !r.error);
  const lastEnd = dated.reduce((max, r) => (r.end > max ? r.end : max), "1970-01-01");
  const firstStart = dated.reduce((min, r) => (r.start < min ? r.start : min), "9999-12-31");
  const existing = members.length
    ? await db.booking.findMany({
        where: {
          membershipId: { in: members.map((m) => m.id) },
          status: { in: ACTIVE_STATUSES },
          startDate: { lte: fromISO(lastEnd) },
          endDate: { gte: fromISO(firstStart) },
        },
        select: { membershipId: true, startDate: true, endDate: true, startPart: true, endPart: true },
      })
    : [];

  const holidays = new Map<string, Awaited<ReturnType<typeof loadHolidays>>>();
  const holidaysFor = async (region: string) => {
    if (!holidays.has(region)) holidays.set(region, await loadHolidays(workspace.id, region));
    return holidays.get(region)!;
  };

  const taken = new Map<string, { start: string; end: string; startPart: "FULL" | "PM" | "AM"; endPart: "FULL" | "PM" | "AM" }[]>();
  for (const b of existing) {
    const list = taken.get(b.membershipId) ?? [];
    list.push({
      start: b.startDate.toISOString().slice(0, 10),
      end: b.endDate.toISOString().slice(0, 10),
      startPart: b.startPart,
      endPart: b.endPart,
    });
    taken.set(b.membershipId, list);
  }

  const out: TimeOffPlanRow[] = [];
  for (const r of rows) {
    const base = { ...r, status: "error" as const, daysCount: 0, membershipId: null as string | null, who: null as string | null };
    const fail = (error: ImportError) => out.push({ ...base, error });
    if (r.error) {
      out.push(base);
      continue;
    }
    const member = memberOf.get(r.email);
    if (!member) {
      fail({ code: "notMember", value: r.email });
      continue;
    }
    base.who = member.user.name ?? member.user.email;
    if (member.removedAt) {
      fail({ code: "removedMember", value: r.email });
      continue;
    }
    const year = (d: string) => Number(d.slice(0, 4));
    if (year(r.start) < thisYear - 1 || year(r.end) > thisYear + 2) {
      fail({ code: "outOfRange" });
      continue;
    }
    const problem = validateSpan(r, settings);
    if (problem) {
      fail({ code: problem === "halfDaysOff" ? "halfDaysOff" : "half" });
      continue;
    }
    const rules = rulesFor(member, settings, await holidaysFor(regionOf(member, settings)));
    const daysCount = countDays(r, rules);
    if (daysCount === 0) {
      fail({ code: "noWorkingDays" });
      continue;
    }
    const others = taken.get(member.id) ?? [];
    if (others.some((o) => spansConflict(r, o))) {
      fail({ code: "overlap" });
      continue;
    }
    taken.set(member.id, [...others, r]);
    out.push({ ...r, status: "ok", daysCount, membershipId: member.id, who: base.who });
  }

  const ok = out.filter((r) => r.status === "ok");
  const memberCount = await db.membership.count({ where: { workspaceId: workspace.id, removedAt: null, isSample: false } });
  return {
    rows: out,
    counts: { ok: ok.length, errors: out.length - ok.length, days: ok.reduce((sum, r) => sum + r.daysCount, 0) },
    tooMany,
    overLimit: isOverLimit(accessOf(workspace), memberCount),
  };
}

/** Adds the valid rows as approved bookings (an admin entered them). Rows with problems are left out and reported. */
export async function applyTimeOff(
  workspace: Workspace,
  settings: Settings,
  actor: Actor,
  text: string,
): Promise<{ created: number; days: number } | { error: "tooMany" | "overLimit" | "nothing" | "conflict" }> {
  const plan = await planTimeOff(workspace, settings, text);
  if (plan.tooMany) return { error: "tooMany" };
  if (plan.overLimit) return { error: "overLimit" };
  const ok = plan.rows.filter((r) => r.status === "ok");
  if (ok.length === 0) return { error: "nothing" };
  try {
    await db.booking.createMany({
      data: ok.map((r) => ({
        workspaceId: workspace.id,
        membershipId: r.membershipId!,
        startDate: fromISO(r.start),
        endDate: fromISO(r.end),
        startPart: r.startPart,
        endPart: r.endPart,
        type: r.type,
        status: "APPROVED" as const,
        daysCount: r.daysCount,
        createdById: actor.id,
        ...(settings.approvalsEnabled ? { decidedById: actor.id, decidedAt: new Date() } : {}),
      })),
    });
  } catch (e) {
    // Someone booked the same days while the admin was looking at the preview.
    if (isOverlapError(e)) return { error: "conflict" };
    throw e;
  }
  await recordAudit({ workspaceId: workspace.id, actorId: actor.id, action: "import.timeoff", detail: String(ok.length) });
  return { created: ok.length, days: plan.counts.days };
}
