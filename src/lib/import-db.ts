import { recordAudit } from "@/lib/audit";
import { countDays, validateSpan } from "@/lib/booking-days";
import { ACTIVE_STATUSES, isOverlapError, loadHolidays, regionOf, rulesFor, type Settings } from "@/lib/bookings";
import { fromISO, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { regionsOf } from "@/lib/holiday-regions";
import { isLocale, messagesFor, type Locale } from "@/lib/i18n";
import { findPerson, parsePeople, spansConflict, type ImportError, type PersonRow, type TimeOffRow } from "@/lib/import";
import { readTimeOff, type TimeOffSource } from "@/lib/import-time-off";
import { hasNoEmail, NO_EMAIL_DOMAIN, noEmailAddress } from "@/lib/no-email";
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
/** A year planner for 75 people easily holds 600 bookings, so time off may have more rows. */
export const MAX_TIME_OFF_ROWS = 2000;

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

  const emails = parsed.filter((r) => !r.error && r.email).map((r) => r.email);
  const [existing, withoutEmail, current] = await Promise.all([
    db.membership.findMany({
      where: { workspaceId: workspace.id, isSample: false, user: { email: { in: emails } } },
      select: { removedAt: true, user: { select: { email: true } } },
    }),
    noEmailMembers(workspace.id),
    db.membership.count({ where: { workspaceId: workspace.id, removedAt: null, isSample: false } }),
  ]);
  const byEmail = new Map(existing.map((m) => [m.user.email, m]));

  const rows = parsed.slice(0, MAX_IMPORT_ROWS).map((r): PeopleRow => {
    if (r.error) return { ...r, status: "error" };
    // Someone without email is matched by name, so importing the same sheet twice doesn't add them twice.
    const m = r.email ? byEmail.get(r.email) : withoutEmail.get(nameKey(r.name ?? ""));
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

const nameKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

/** People added without email in this workspace, by name. */
async function noEmailMembers(workspaceId: string) {
  const members = await db.membership.findMany({
    where: { workspaceId, isSample: false, user: { email: { endsWith: `@${NO_EMAIL_DOMAIN}` } } },
    include: { user: { select: { email: true, name: true } } },
  });
  return new Map(members.map((m) => [nameKey(m.user.name ?? ""), m]));
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
  const year = Number(todayIn(workspace.timezone).slice(0, 4));
  const users = await db.$transaction(async (tx) => {
    const made: { email: string; name: string | null; locale: string | null }[] = [];
    for (const r of fresh) {
      const email = r.email || noEmailAddress();
      const user = await tx.user.upsert({
        where: { email },
        create: { email, name: r.name },
        // Someone who already uses the app elsewhere keeps their own name.
        update: {},
        select: { id: true, name: true, locale: true },
      });
      if (!user.name && r.name) await tx.user.update({ where: { id: user.id }, data: { name: r.name } });
      const membership = await tx.membership.upsert({
        where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
        create: {
          workspaceId: workspace.id,
          userId: user.id,
          // Someone without email can't sign in, so they can't be an admin either.
          role: r.email ? r.role : "MEMBER",
          annualAllowanceDays: r.allowance ?? defaultAllowance,
          workDays: r.workDays ?? [],
          employmentStart: r.employmentStart ? fromISO(r.employmentStart) : null,
          holidayRegion: r.region,
        },
        update: {},
      });
      if (r.carriedOver !== null) {
        await tx.carriedOver.upsert({
          where: { membershipId_year: { membershipId: membership.id, year } },
          create: { membershipId: membership.id, year, days: r.carriedOver },
          update: { days: r.carriedOver },
        });
      }
      // People without email get nothing sent; they're counted in "created" all the same.
      if (r.email) made.push({ email: r.email, name: r.name ?? user.name, locale: user.locale });
    }
    return made;
  });

  await recordAudit({ workspaceId: workspace.id, actorId: actor.id, action: "import.people", detail: String(fresh.length) });

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
  return { created: fresh.length, emailed, emailFailed };
}

// ---------- time off ----------

export type TimeOffPlanRow = TimeOffRow & { status: "ok" | "error"; daysCount: number; membershipId: string | null; who: string | null };

export type TimeOffPlan = {
  rows: TimeOffPlanRow[];
  counts: { ok: number; errors: number; days: number };
  tooMany: boolean;
  overLimit: boolean;
  /** What the text was read as: a list, an Excel year planner or a calendar file. */
  source: TimeOffSource;
};

export async function planTimeOff(workspace: Workspace, settings: Settings, text: string, now = new Date()): Promise<TimeOffPlan> {
  const today = todayIn(workspace.timezone, now);
  const thisYear = Number(today.slice(0, 4));
  const { rows: parsed, source } = readTimeOff(text, today);
  const tooMany = parsed.length > MAX_TIME_OFF_ROWS;
  const rows = parsed.slice(0, MAX_TIME_OFF_ROWS);

  const members = await db.membership.findMany({
    where: { workspaceId: workspace.id, isSample: false },
    include: { user: { select: { email: true, name: true } } },
  });
  const byEmail = new Map(members.map((m) => [m.user.email, m]));
  const byId = new Map(members.map((m) => [m.id, m]));
  const known = (list: typeof members) => list.map((m) => ({ id: m.id, name: m.user.name, email: hasNoEmail(m.user.email) ? "" : m.user.email }));
  const active = known(members.filter((m) => !m.removedAt));
  const removed = known(members.filter((m) => m.removedAt));
  // A row with an email names that person; a name is looked up among the people in, then among those removed.
  const memberFor = (r: TimeOffRow) => {
    if (r.email) return byEmail.get(r.email);
    const id = findPerson(r.name, active) ?? findPerson(r.name, removed);
    return id === "ambiguous" ? id : id ? byId.get(id) : undefined;
  };
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
    const member = memberFor(r);
    if (member === "ambiguous") {
      fail({ code: "ambiguousName", value: r.name });
      continue;
    }
    if (!member) {
      fail({ code: "notMember", value: r.email || r.name });
      continue;
    }
    base.who = member.user.name ?? member.user.email;
    if (member.removedAt) {
      fail({ code: "removedMember", value: r.email || r.name });
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
    source,
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
