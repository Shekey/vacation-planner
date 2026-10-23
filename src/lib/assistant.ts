import { createHmac, timingSafeEqual } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BookingType } from "@/generated/prisma/client";
import { recordAudit } from "@/lib/audit";
import { countDays, portionOn, spansOverlap, validateSpan, type BookingSpan, type DayPart } from "@/lib/booking-days";
import {
  ACTIVE_STATUSES,
  BookingError,
  activeBookingsBetween,
  allowanceSummary,
  cancelBooking,
  createBooking,
  decideBooking,
  forViewer,
  initialStatus,
  loadHolidays,
  regionOf,
  rulesFor,
  spanOf,
  type Settings,
} from "@/lib/bookings";
import { addDays, eachDay, fromISO, isISODate, todayIn, type ISODate } from "@/lib/dates";
import { db } from "@/lib/db";
import { getMessages } from "@/lib/i18n/server";
import { can } from "@/lib/permissions";
import type { TokenContext } from "@/lib/personal-tokens";
import { reviewRequests } from "@/lib/request-review";
import { understaffedDays } from "@/lib/staffing";

/**
 * The tools an AI assistant gets with a personal token (#45), served at /api/mcp. Everything goes through the same
 * functions as the app (src/lib/bookings.ts), so allowance, approvals, holidays, staffing and permissions behave
 * exactly the same. The assistant acts for one person in one workspace, books and cancels only their own time off, and
 * sees colleagues' time off as "away" unless the person decides requests. Every call is in the activity log.
 */

/** Calls per person and workspace: enough for a conversation, not for scraping the team's calendar. */
export const CALLS_PER_MINUTE = 30;
export const CALLS_PER_DAY = 500;
/** How long a preview may be booked. */
export const PREVIEW_MINUTES = 15;
/** The longest range the read tools look at. */
const MAX_RANGE_DAYS = 92;

export type AssistantContext = TokenContext & {
  workspace: { id: string; name: string; slug: string; timezone: string };
  settings: Settings;
  origin: string;
};

type Kind = "vacation" | "other";
const TYPE_OF: Record<Kind, BookingType> = { vacation: "VACATION", other: "OTHER" };
type Preview = BookingSpan & { membershipId: string; kind: Kind; expires: number };

// ---- The preview a booking needs: signed, so the assistant can't book something the person didn't see ----

function sign(payload: string, secret: string): string {
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", `assistant-preview:${secret}`).update(payload).digest("base64url");
}

export function previewToken(preview: Omit<Preview, "expires">, now = new Date(), secret = process.env.AUTH_SECRET ?? ""): string {
  const body: Preview = { ...preview, expires: Math.floor(now.getTime() / 1000) + PREVIEW_MINUTES * 60 };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function readPreviewToken(token: string, now = new Date(), secret = process.env.AUTH_SECRET ?? ""): Preview | null {
  const [payload, mac, extra] = token.split(".");
  if (!payload || !mac || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Preview;
    return p.expires * 1000 < now.getTime() ? null : p;
  } catch {
    return null;
  }
}

// ---- Helpers ----

class ToolError extends Error {}

function range(from: string, to: string | undefined): { from: ISODate; to: ISODate } {
  const end = to ?? from;
  if (!isISODate(from) || !isISODate(end)) throw new ToolError("Dates must be YYYY-MM-DD.");
  if (end < from) throw new ToolError("The end date is before the start date.");
  if (end > addDays(from, MAX_RANGE_DAYS - 1)) throw new ToolError(`Ask for at most ${MAX_RANGE_DAYS} days at a time.`);
  return { from, to: end };
}

function personLabel(user: { name: string | null; email: string }) {
  return user.name ?? user.email;
}

/** What the caller may see of a booking: their own in full; others' type only for people who decide requests. */
function visibleType(ctx: AssistantContext, b: { membershipId: string; type: BookingType }) {
  if (b.membershipId === ctx.membership.id || can(ctx.membership.role, "bookings:decide")) return b.type.toLowerCase();
  return "away";
}

async function teamOff(ctx: AssistantContext, from: ISODate, to: ISODate, where?: (b: { membershipId: string }) => boolean) {
  // The answer goes to an AI provider, so like the calendar feed even an admin's assistant sees colleagues' sick days as "other".
  const viewer = { membershipId: ctx.membership.id, role: "MEMBER" as const };
  const bookings = forViewer(await activeBookingsBetween(ctx.workspace.id, from, to), viewer).filter((b) => !where || where(b));
  return bookings.map((b) => {
    const span = spanOf(b);
    return {
      person: personLabel(b.membership.user),
      from: span.start,
      to: span.end,
      ...(span.startPart !== "FULL" || span.endPart !== "FULL" ? { first_day: span.startPart, last_day: span.endPart } : {}),
      type: visibleType(ctx, b),
      ...(b.membershipId === ctx.membership.id || can(ctx.membership.role, "bookings:decide") ? { status: b.status.toLowerCase() } : {}),
    };
  });
}

async function me(ctx: AssistantContext) {
  return db.membership.findUniqueOrThrow({ where: { id: ctx.membership.id } });
}

/** Days, allowance and conflicts for booking `span` as the caller, the same checks createBooking makes. */
async function preview(ctx: AssistantContext, span: BookingSpan, kind: Kind) {
  const t = (await getMessages()).errors;
  const membership = await me(ctx);
  const type = TYPE_OF[kind];
  const actor = { userId: ctx.user.id, membershipId: membership.id, role: membership.role };
  if (!can(actor.role, "bookings:own")) throw new BookingError(t.viewerCantBook);
  const problem = validateSpan(span, ctx.settings);
  if (problem) throw new BookingError(t[problem]);
  const holidays = await loadHolidays(ctx.workspace.id, regionOf(membership, ctx.settings));
  const rules = rulesFor(membership, ctx.settings, holidays);
  const days = countDays(span, rules);
  if (days === 0) throw new BookingError(t.noWorkingDays);

  const others = await activeBookingsBetween(ctx.workspace.id, span.start, span.end);
  if (others.some((b) => b.membershipId === membership.id && spansOverlap(spanOf(b), span))) throw new BookingError(t.overlap);

  // Per calendar year, since a booking over New Year counts against two allowances.
  const years = [...new Set([span.start, span.end].map((d) => Number(d.slice(0, 4))))];
  const allowance = await Promise.all(
    years.map(async (year) => {
      const summary = await allowanceSummary(membership, ctx.settings, year, undefined, todayIn(ctx.workspace.timezone));
      const inYear = countDays(span, rules, { from: `${year}-01-01`, to: `${year}-12-31` });
      return {
        year,
        days_in_this_booking: inYear,
        ...(summary.remaining === null
          ? { tracked: false }
          : { days_left_before: summary.remaining, days_left_after: kind === "vacation" ? summary.remaining - inYear : summary.remaining }),
      };
    }),
  );
  const memberCount = await db.membership.count({ where: { workspaceId: ctx.workspace.id, removedAt: null } });
  const short = understaffedDays({
    candidate: { ...span, membershipId: membership.id },
    team: others.filter((o) => o.membershipId !== membership.id && o.status === "APPROVED").map((o) => ({ ...spanOf(o), membershipId: o.membershipId })),
    memberCount,
    minPresent: ctx.settings.minPeoplePresent,
    rules,
  });
  const alsoOff = [
    ...new Set(
      others
        .filter((o) => o.membershipId !== membership.id && eachDay(span.start, span.end).some((d) => portionOn(spanOf(o), d)))
        .map((o) => personLabel(o.membership.user)),
    ),
  ];
  return {
    from: span.start,
    to: span.end,
    first_day: span.startPart,
    last_day: span.endPart,
    type: kind,
    days_counted: days,
    allowance,
    over_allowance: allowance.some((a) => "days_left_after" in a && (a.days_left_after ?? 0) < 0),
    needs_approval: initialStatus(actor, ctx.settings, type, membership.id) === "PENDING",
    also_off: alsoOff,
    short_staffed_days: short.map((s) => s.day),
  };
}

// ---- The server ----

type Result = { content: { type: "text"; text: string }[]; isError?: boolean };

/** An MCP server with the tools this person may use, for one request. */
export function assistantServer(ctx: AssistantContext): McpServer {
  const server = new McpServer({ name: "urlaubflow", version: "1.0.0" }, { instructions: instructionsFor(ctx) });
  const actor = { userId: ctx.user.id, membershipId: ctx.membership.id, role: ctx.membership.role };

  /** Runs a tool after the rate limit, logs it, and turns refusals into a message the assistant can pass on. */
  async function run(tool: string, fn: () => Promise<unknown>): Promise<Result> {
    try {
      await checkRate(ctx);
      await recordAudit({ workspaceId: ctx.workspace.id, actorId: ctx.user.id, action: "assistant.call", detail: tool });
      const value = await fn();
      return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
    } catch (e) {
      if (e instanceof BookingError || e instanceof ToolError) return { content: [{ type: "text", text: e.message }], isError: true };
      throw e;
    }
  }

  const span = {
    from: z.string().describe("First day, YYYY-MM-DD"),
    to: z.string().optional().describe("Last day, YYYY-MM-DD; the same as `from` when left out"),
  };
  const read = { readOnlyHint: true, openWorldHint: false } as const;

  server.registerTool(
    "who_is_off",
    { title: "Who is off", description: "Who in the team is away between two dates (at most 92 days).", inputSchema: span, annotations: read },
    async ({ from, to }) =>
      run("who_is_off", async () => {
        const r = range(from, to);
        return { off: await teamOff(ctx, r.from, r.to) };
      }),
  );

  server.registerTool(
    "is_person_off",
    {
      title: "Is someone off",
      description: "Whether a colleague is away between two dates. `name` matches part of their name or email.",
      inputSchema: { name: z.string().min(2).max(100), ...span },
      annotations: read,
    },
    async ({ name, from, to }) =>
      run("is_person_off", async () => {
        const r = range(from, to);
        const needle = name.trim();
        const people = await db.membership.findMany({
          where: {
            workspaceId: ctx.workspace.id,
            removedAt: null,
            user: { OR: [{ name: { contains: needle, mode: "insensitive" } }, { email: { contains: needle, mode: "insensitive" } }] },
          },
          include: { user: { select: { name: true, email: true } } },
          take: 10,
        });
        if (people.length === 0) throw new ToolError(`Nobody in ${ctx.workspace.name} matches "${needle}".`);
        const ids = new Set(people.map((p) => p.id));
        const off = await teamOff(ctx, r.from, r.to, (b) => ids.has(b.membershipId));
        return people.map((p) => {
          const label = personLabel(p.user);
          const theirs = off.filter((o) => o.person === label);
          return { person: label, off: theirs.length > 0, time_off: theirs };
        });
      }),
  );

  if (can(ctx.membership.role, "bookings:own")) {
    server.registerTool(
      "my_balance",
      {
        title: "My vacation balance",
        description: "The caller's vacation allowance for a year: total, taken, requested and left.",
        inputSchema: { year: z.number().int().min(2000).max(2100).optional().describe("Defaults to this year") },
        annotations: read,
      },
      async ({ year }) =>
        run("my_balance", async () => {
          const y = year ?? Number(todayIn(ctx.workspace.timezone).slice(0, 4));
          const s = await allowanceSummary(await me(ctx), ctx.settings, y, undefined, todayIn(ctx.workspace.timezone));
          if (s.remaining === null) return { year: y, tracked: false };
          return {
            year: y,
            allowance: s.allowance,
            carried_over: s.carriedOver,
            ...(s.carryOverExpiresOn ? { carried_over_expires_on: s.carryOverExpiresOn, carried_over_left_to_take: s.carryOverLeft } : {}),
            taken: s.used,
            requested: s.pending,
            left: s.remaining,
          };
        }),
    );

    server.registerTool(
      "my_time_off",
      {
        title: "My time off",
        description: "The caller's own booked and requested time off from a day on (default today), with ids for cancel_time_off.",
        inputSchema: { from: z.string().optional().describe("YYYY-MM-DD, default today") },
        annotations: read,
      },
      async ({ from }) =>
        run("my_time_off", async () => {
          const start = from ?? todayIn(ctx.workspace.timezone);
          if (!isISODate(start)) throw new ToolError("Dates must be YYYY-MM-DD.");
          const rows = await db.booking.findMany({
            where: { membershipId: ctx.membership.id, status: { in: ACTIVE_STATUSES }, endDate: { gte: fromISO(start) } },
            orderBy: { startDate: "asc" },
            take: 50,
          });
          return rows.map((b) => {
            const s = spanOf(b);
            return { id: b.id, from: s.start, to: s.end, first_day: s.startPart, last_day: s.endPart, type: b.type.toLowerCase(), status: b.status.toLowerCase(), days: Number(b.daysCount) };
          });
        }),
    );

    const part = z.enum(["FULL", "AM", "PM"]);
    server.registerTool(
      "preview_time_off",
      {
        title: "Preview time off",
        description:
          "Checks booking time off for the caller without saving it: days counted, days left after, whether it needs approval, " +
          "who else is off and short-staffed days. Show this to the person; book_time_off needs the returned confirmation " +
          `within ${PREVIEW_MINUTES} minutes. Half days: first_day PM means from the afternoon, last_day AM means until noon.`,
        inputSchema: {
          ...span,
          first_day: part.optional().describe("FULL (default), or PM to start at noon"),
          last_day: part.optional().describe("FULL (default), or AM to end at noon"),
          type: z.enum(["vacation", "other"]).optional().describe("vacation (default, counts against the allowance) or other"),
        },
        annotations: read,
      },
      async ({ from, to, first_day, last_day, type }) =>
        run("preview_time_off", async () => {
          if (!isISODate(from) || !isISODate(to ?? from)) throw new ToolError("Dates must be YYYY-MM-DD.");
          const s: BookingSpan = { start: from, end: to ?? from, startPart: (first_day ?? "FULL") as DayPart, endPart: (last_day ?? "FULL") as DayPart };
          const kind = type ?? "vacation";
          const result = await preview(ctx, s, kind);
          return { ...result, confirmation: previewToken({ ...s, membershipId: ctx.membership.id, kind }) };
        }),
    );

    server.registerTool(
      "book_time_off",
      {
        title: "Book time off",
        description:
          "Books what preview_time_off showed, for the caller. Only after the person has seen the preview and said yes. " +
          "Takes the preview's confirmation; an optional note goes to whoever approves it.",
        inputSchema: { confirmation: z.string().max(2000), note: z.string().max(500).optional() },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      },
      async ({ confirmation, note }) =>
        run("book_time_off", async () => {
          const p = readPreviewToken(confirmation);
          if (!p || p.membershipId !== ctx.membership.id) throw new ToolError("This confirmation has expired or isn't from preview_time_off. Preview again first.");
          const booking = await createBooking({
            workspace: ctx.workspace,
            settings: ctx.settings,
            actor,
            membershipId: ctx.membership.id,
            input: { start: p.start, end: p.end, startPart: p.startPart, endPart: p.endPart, type: TYPE_OF[p.kind], note: note?.trim() || null },
            origin: ctx.origin,
          });
          return { id: booking.id, status: booking.status.toLowerCase(), days: Number(booking.daysCount), link: `${ctx.origin}/w/${ctx.workspace.slug}/me` };
        }),
    );

    server.registerTool(
      "cancel_time_off",
      {
        title: "Cancel time off",
        description: "Cancels one of the caller's own bookings by id (from my_time_off). It can be restored in the app for a while.",
        inputSchema: { booking_id: z.string().max(100) },
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
      },
      async ({ booking_id }) =>
        run("cancel_time_off", async () => {
          const t = (await getMessages()).errors;
          // Only one's own: an assistant never cancels a colleague's time off, even for an admin.
          const own = await db.booking.count({ where: { id: booking_id, membershipId: ctx.membership.id } });
          if (!own) throw new BookingError(t.bookingNotFound);
          await cancelBooking({ workspaceId: ctx.workspace.id, actor, bookingId: booking_id });
          return { cancelled: booking_id };
        }),
    );
  }

  if (can(ctx.membership.role, "bookings:decide")) {
    server.registerTool(
      "pending_approvals",
      {
        title: "Requests waiting",
        description: "Time-off requests waiting for a decision, with days left, who else is off and short-staffed days.",
        annotations: read,
      },
      async () =>
        run("pending_approvals", async () => {
          const { rows } = await reviewRequests(ctx.workspace, ctx.settings, {}, todayIn(ctx.workspace.timezone));
          return rows
            .filter((r) => r.b.membershipId !== ctx.membership.id || ctx.membership.role === "ADMIN")
            .map((r) => ({
              id: r.b.id,
              person: personLabel(r.b.membership.user),
              from: r.span.start,
              to: r.span.end,
              type: r.b.type.toLowerCase(),
              days: r.b.days,
              note: r.b.note,
              days_left_after: r.summary.remaining,
              also_off: r.clashes,
              short_staffed_days: r.shortDays.map((s) => s.day),
            }));
        }),
    );

    server.registerTool(
      "decide",
      {
        title: "Approve or decline",
        description: "Approves or declines a waiting request by id (from pending_approvals). Only when the person said so.",
        inputSchema: { id: z.string().max(100), decision: z.enum(["approve", "decline"]), note: z.string().max(500).optional() },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      },
      async ({ id, decision, note }) =>
        run("decide", async () => {
          await decideBooking({
            workspace: ctx.workspace,
            settings: ctx.settings,
            actor,
            bookingId: id,
            approve: decision === "approve",
            note: note?.trim() || null,
            origin: ctx.origin,
          });
          return { id, decision };
        }),
    );
  }
  return server;
}

function instructionsFor(ctx: AssistantContext) {
  return [
    `You are connected to Urlaubflow, the time-off planner of ${ctx.workspace.name}, as ${personLabel(ctx.user)} (${ctx.membership.role.toLowerCase()}).`,
    "Dates are YYYY-MM-DD. Before booking, always call preview_time_off, show the person the result, and only call book_time_off after they agree.",
    "Colleagues' time off shows as 'away'; don't guess the reason.",
  ].join(" ");
}

/** At most CALLS_PER_MINUTE a minute and CALLS_PER_DAY a day per person and workspace, counted from the activity log. */
async function checkRate(ctx: AssistantContext) {
  const now = Date.now();
  const since = (ms: number) => db.auditEvent.count({ where: { workspaceId: ctx.workspace.id, actorId: ctx.user.id, action: "assistant.call", createdAt: { gte: new Date(now - ms) } } });
  if ((await since(60_000)) >= CALLS_PER_MINUTE || (await since(24 * 60 * 60_000)) >= CALLS_PER_DAY) {
    throw new ToolError("Too many requests from this assistant. Please wait a minute and try again.");
  }
}
