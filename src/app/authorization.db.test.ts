import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { approveToken } from "@/lib/approve-link";
import { cancelBooking, createBooking } from "@/lib/bookings";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { makeUser, makeWorkspace } from "@/test/db";

import * as account from "./account/actions";
import * as operator from "./admin/actions";
import * as twoFactor from "./two-factor/actions";
import * as decide from "./decide/[token]/actions";
import * as approvals from "./w/[slug]/approvals/actions";
import * as billing from "./w/[slug]/billing/actions";
import * as book from "./w/[slug]/book/actions";
import * as holidays from "./w/[slug]/holidays/actions";
import * as importer from "./w/[slug]/import/actions";
import * as me from "./w/[slug]/me/actions";
import * as members from "./w/[slug]/members/actions";
import * as onboarding from "./w/[slug]/onboarding-actions";
import * as sampleTeam from "./w/[slug]/sample-team-actions";
import * as settings from "./w/[slug]/settings/actions";
import * as support from "./w/[slug]/settings/support-actions";
import * as newWorkspace from "./workspaces/new/actions";
import * as restoreWorkspace from "./workspaces/restore-actions";

/**
 * Who may call which server action (#79). Server actions are public endpoints: anyone can call them with any
 * arguments, so every one must check the caller itself. This test calls each one as someone signed out, as an admin of
 * another workspace (with that workspace's slug and with ours), and as a member, and checks that only the roles listed
 * get through and that nothing in our workspace changed or was emailed otherwise.
 *
 * A new server action fails the last test until it is listed here.
 */

vi.mock("@/auth", () => ({ auth: vi.fn(async () => null), signIn: vi.fn(), signOut: vi.fn() }));

type World = Awaited<ReturnType<typeof makeWorld>>;
type Caller = "signedOut" | "outsider" | "member" | "admin";

/**
 * - `admin`, `member`: workspace actions, called with our slug (and the outsider's) and ids from our workspace.
 * - `self`: acts on the caller's own account; only needs a sign-in.
 * - `operator`: the operator's area; refused for everyone here, none of them is in SUPERADMIN_EMAILS.
 * - `link`: the approve link from a request email; works signed out, but only with a token signed for an admin of the
 *   booking's own workspace. `call` uses a token for the other workspace's admin, `allowedCall` our admin's.
 * - `public`: sign-in and language, meant to work signed out.
 */
type Entry =
  | { allowed: "admin" | "member" | "self" | "operator"; call: (w: World, slug: string) => Promise<unknown> }
  | { allowed: "link"; call: (w: World, slug: string) => Promise<unknown>; allowedCall: (w: World) => Promise<unknown> }
  | { allowed: "public" };

function form(fields: Record<string, string | string[]> = {}) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const value of [v].flat()) data.append(k, value);
  return data;
}

const origin = "https://app.test";
const week = { type: "VACATION" as const, note: null, startPart: "FULL" as const, endPart: "FULL" as const };

async function makeWorld() {
  const ours = await makeWorkspace({ approvalsEnabled: true });
  const theirs = await makeWorkspace();
  const book = (actor: typeof ours.admin | typeof ours.member, start: string, end: string) =>
    createBooking({ workspace: ours.workspace, settings: ours.settings, actor: actor.actor, membershipId: actor.id, input: { ...week, start, end }, origin });

  const pending = await book(ours.member, "2030-03-04", "2030-03-08");
  const adminBooking = await book(ours.admin, "2030-04-01", "2030-04-05");
  const cancelled = await book(ours.admin, "2030-05-06", "2030-05-10");
  await cancelBooking({ workspaceId: ours.workspace.id, actor: ours.admin.actor, bookingId: cancelled.id });
  const leaver = await makeUser("Leaver");
  const removed = await db.membership.create({ data: { workspaceId: ours.workspace.id, userId: leaver.id, removedAt: new Date() } });
  const invitation = await db.invitation.create({
    data: { workspaceId: ours.workspace.id, email: "invited@test.invalid", tokenHash: `hash-${pending.id}`, expiresAt: new Date("2031-01-01") },
  });
  const holiday = await db.holiday.create({ data: { workspaceId: ours.workspace.id, date: new Date("2030-10-03"), name: "Tag der Deutschen Einheit" } });
  return { ours, theirs, pending, adminBooking, cancelled, removed, invitation, holiday };
}

const matrix: Record<string, Entry> = {
  "account/actions.ts#saveNameAction": { allowed: "self", call: () => account.saveNameAction({}, form({ name: "Changed" })) },
  "account/actions.ts#deleteAccountAction": { allowed: "self", call: () => account.deleteAccountAction({}, form({ confirmEmail: "nobody@test.invalid" })) },

  "admin/actions.ts#extendTrialAction": { allowed: "operator", call: (w) => operator.extendTrialAction(w.ours.workspace.id, {}, form({ days: "30" })) },
  "admin/actions.ts#restoreWorkspaceAsOperatorAction": { allowed: "operator", call: (w) => operator.restoreWorkspaceAsOperatorAction(w.ours.workspace.id) },
  "admin/actions.ts#startPostBetaTrialAction": { allowed: "operator", call: () => operator.startPostBetaTrialAction() },
  "admin/actions.ts#sendSentryTestAction": { allowed: "operator", call: () => operator.sendSentryTestAction() },
  "two-factor/actions.ts#confirmSetupAction": { allowed: "operator", call: () => twoFactor.confirmSetupAction({}, form({ code: "123456" })) },
  "two-factor/actions.ts#verifyAction": { allowed: "operator", call: () => twoFactor.verifyAction("/admin", {}, form({ code: "123456" })) },
  "two-factor/actions.ts#renewCodesAction": { allowed: "operator", call: () => twoFactor.renewCodesAction() },

  "language/actions.ts#setLanguage": { allowed: "public" },
  "sign-in/actions.ts#sendSignInLinkAction": { allowed: "public" },
  "workspaces/new/actions.ts#createWorkspaceAction": { allowed: "self", call: () => newWorkspace.createWorkspaceAction({}, form({ name: "New team" })) },
  // Only for admins of the deleted workspace; ours isn't deleted and the others aren't its admins.
  "workspaces/restore-actions.ts#restoreWorkspaceAction": { allowed: "self", call: (w) => restoreWorkspace.restoreWorkspaceAction(w.ours.workspace.id) },

  "decide/[token]/actions.ts#decideByLinkAction": {
    allowed: "link",
    call: (w) => decide.decideByLinkAction(approveToken({ bookingId: w.pending.id, membershipId: w.theirs.admin.id }), {}, form({ decision: "approve" })),
    allowedCall: (w) => decide.decideByLinkAction(approveToken({ bookingId: w.pending.id, membershipId: w.ours.admin.id }), {}, form({ decision: "approve" })),
  },
  "w/[slug]/approvals/actions.ts#decideAction": {
    allowed: "admin",
    call: (w, slug) => approvals.decideAction(slug, w.pending.id, {}, form({ decision: "approve" })),
  },
  "w/[slug]/billing/actions.ts#checkoutAction": { allowed: "admin", call: (_w, slug) => billing.checkoutAction(slug, "TEAM", "monthly") },
  "w/[slug]/billing/actions.ts#portalAction": { allowed: "admin", call: (_w, slug) => billing.portalAction(slug) },

  // Booking for the admin: a member may only book for themselves.
  "w/[slug]/book/actions.ts#saveBooking": {
    allowed: "admin",
    call: (w, slug) =>
      book.saveBooking(slug, null, {}, form({ membershipId: w.ours.admin.id, type: "VACATION", start: "2030-06-03", end: "2030-06-04", startPart: "FULL", endPart: "FULL" })),
  },
  "w/[slug]/book/actions.ts#cancelBookingAction": { allowed: "admin", call: (w, slug) => book.cancelBookingAction(slug, w.adminBooking.id) },
  "w/[slug]/book/actions.ts#restoreBookingAction": { allowed: "admin", call: (w, slug) => book.restoreBookingAction(slug, w.cancelled.id) },

  "w/[slug]/holidays/actions.ts#addHolidayAction": {
    allowed: "admin",
    call: (_w, slug) => holidays.addHolidayAction(slug, {}, form({ date: "2030-12-24", name: "Heiligabend", region: "" })),
  },
  "w/[slug]/holidays/actions.ts#deleteHolidayAction": { allowed: "admin", call: (w, slug) => holidays.deleteHolidayAction(slug, w.holiday.id) },
  "w/[slug]/holidays/actions.ts#importHolidaysAction": {
    allowed: "admin",
    call: (_w, slug) => holidays.importHolidaysAction(slug, {}, form({ country: "XX", year: "2030" })),
  },
  "w/[slug]/holidays/actions.ts#setMyRegionAction": { allowed: "member", call: (_w, slug) => holidays.setMyRegionAction(slug, {}, form({ region: "" })) },

  "w/[slug]/import/actions.ts#previewImportAction": { allowed: "admin", call: (_w, slug) => importer.previewImportAction(slug, "people", "Name\nZoe Import") },
  "w/[slug]/import/actions.ts#applyImportAction": { allowed: "admin", call: (_w, slug) => importer.applyImportAction(slug, "people", "Name\nZoe Import", false) },

  // Not a Sheets link, so nothing is fetched; admins get "not a Google Sheets link" back.
  "w/[slug]/import/actions.ts#loadSheetAction": { allowed: "admin", call: (_w, slug) => importer.loadSheetAction(slug, "https://example.com/sheet") },

  "w/[slug]/me/actions.ts#resetCalendarFeedAction": { allowed: "member", call: (_w, slug) => me.resetCalendarFeedAction(slug) },
  "w/[slug]/me/actions.ts#disableCalendarFeedAction": { allowed: "member", call: (_w, slug) => me.disableCalendarFeedAction(slug) },

  "w/[slug]/members/actions.ts#inviteAction": { allowed: "admin", call: (_w, slug) => members.inviteAction(slug, {}, form({ emails: "new@test.invalid", role: "ADMIN" })) },
  "w/[slug]/members/actions.ts#addWithoutEmailAction": { allowed: "admin", call: (_w, slug) => members.addWithoutEmailAction(slug, {}, form({ name: "Paper Person" })) },
  "w/[slug]/members/actions.ts#resendInviteAction": { allowed: "admin", call: (w, slug) => members.resendInviteAction(slug, w.invitation.id) },
  "w/[slug]/members/actions.ts#revokeInviteAction": { allowed: "admin", call: (w, slug) => members.revokeInviteAction(slug, w.invitation.id) },
  "w/[slug]/members/actions.ts#updateMemberAction": {
    allowed: "admin",
    call: (w, slug) => members.updateMemberAction(slug, w.ours.member.id, {}, form({ role: "ADMIN", allowance: "40" })),
  },
  "w/[slug]/members/actions.ts#removeMemberAction": { allowed: "admin", call: (w, slug) => members.removeMemberAction(slug, w.ours.member.id) },
  "w/[slug]/members/actions.ts#restoreMemberAction": { allowed: "admin", call: (w, slug) => members.restoreMemberAction(slug, w.removed.id) },

  "w/[slug]/onboarding-actions.ts#dismissOnboardingAction": { allowed: "admin", call: (_w, slug) => onboarding.dismissOnboardingAction(slug) },
  "w/[slug]/sample-team-actions.ts#addSampleTeamAction": { allowed: "admin", call: (_w, slug) => sampleTeam.addSampleTeamAction(slug) },
  "w/[slug]/sample-team-actions.ts#removeSampleTeamAction": { allowed: "admin", call: (_w, slug) => sampleTeam.removeSampleTeamAction(slug) },

  "w/[slug]/settings/actions.ts#saveSettingsAction": {
    allowed: "admin",
    call: (_w, slug) => settings.saveSettingsAction(slug, {}, form({ name: "Taken over", timezone: "UTC", defaultAllowanceDays: "99" })),
  },
  "w/[slug]/settings/actions.ts#deleteWorkspaceAction": {
    allowed: "admin",
    call: (w, slug) => settings.deleteWorkspaceAction(slug, {}, form({ confirmName: w.ours.workspace.name })),
  },
  "w/[slug]/settings/actions.ts#sendTestPostAction": { allowed: "admin", call: (_w, slug) => settings.sendTestPostAction(slug, "teams") },
  "w/[slug]/settings/support-actions.ts#setSupportAccessAction": { allowed: "admin", call: (_w, slug) => support.setSupportAccessAction(slug, true) },
};

/** Everything in our workspace an action could change, to compare before and after a refused call. */
async function snapshot(workspaceId: string) {
  const [workspace, memberships, bookings, invitations, holidays, audit] = await Promise.all([
    db.workspace.findUnique({ where: { id: workspaceId }, include: { settings: true } }),
    db.membership.findMany({ where: { workspaceId }, include: { user: true, carriedOver: true, keepCarried: true, pastAllowances: true }, orderBy: { id: "asc" } }),
    db.booking.findMany({ where: { workspaceId }, orderBy: { id: "asc" } }),
    db.invitation.findMany({ where: { workspaceId }, orderBy: { id: "asc" } }),
    db.holiday.findMany({ where: { workspaceId }, orderBy: { id: "asc" } }),
    db.auditEvent.count({ where: { workspaceId } }),
  ]);
  return JSON.stringify({ workspace, memberships, bookings, invitations, holidays, audit });
}

function signInAs(user: { id: string; email: string; name: string | null } | null) {
  vi.mocked(auth).mockResolvedValue((user ? { user, expires: "2099-01-01" } : null) as never);
}

type Outcome = { refused: boolean; how: string };

/** Refused means a 404, a redirect to sign in or the second factor, or an error message back. */
async function run(call: () => Promise<unknown>): Promise<Outcome> {
  try {
    const result = await call();
    if (result && typeof result === "object" && "error" in result && result.error) return { refused: true, how: `error: ${String(result.error)}` };
    return { refused: false, how: "returned" };
  } catch (e) {
    const digest = String((e as { digest?: string }).digest ?? "");
    if (digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404")) return { refused: true, how: "404" };
    if (digest.startsWith("NEXT_REDIRECT") && /;\/(sign-in|two-factor)/.test(digest)) return { refused: true, how: digest };
    if (digest.startsWith("NEXT_REDIRECT")) return { refused: false, how: digest };
    // Anything else (Stripe isn't configured here, for one) got past the permission check.
    return { refused: false, how: `threw: ${(e as Error).message}` };
  }
}

const userOf = (m: { user: { id: string; email: string; name: string | null } }) => ({ id: m.user.id, email: m.user.email, name: m.user.name });

describe("who may call which server action", () => {
  for (const [name, entry] of Object.entries(matrix)) {
    if (entry.allowed === "public") continue;

    it(`${name}: ${entry.allowed}`, async () => {
      const w = await makeWorld();
      const ours = w.ours.workspace.slug;
      const theirs = w.theirs.workspace.slug;
      const attempts: { who: Caller; user: ReturnType<typeof userOf> | null; slug: string }[] = [
        { who: "signedOut", user: null, slug: ours },
        { who: "outsider", user: userOf(w.theirs.admin), slug: ours },
        // The forgotten-workspaceId case: allowed into their own workspace, then pointing at our ids.
        { who: "outsider", user: userOf(w.theirs.admin), slug: theirs },
      ];
      if (entry.allowed === "operator") attempts.push({ who: "member", user: userOf(w.ours.member), slug: ours }, { who: "admin", user: userOf(w.ours.admin), slug: ours });
      if (entry.allowed === "admin" || entry.allowed === "link") attempts.push({ who: "member", user: userOf(w.ours.member), slug: ours });

      const before = await snapshot(w.ours.workspace.id);
      for (const { who, user, slug } of attempts) {
        if (entry.allowed === "self" && who !== "signedOut") continue;
        signInAs(user);
        vi.mocked(sendEmail).mockClear();
        const outcome = await run(() => entry.call(w, slug));
        const label = `${who} on ${slug === ours ? "our" : "their"} workspace`;
        // Calling into their own workspace may succeed and send mail there; it just mustn't touch ours.
        if (who === "outsider" && slug === theirs) continue;
        expect(outcome, label).toMatchObject({ refused: true });
        expect(vi.mocked(sendEmail).mock.calls.map(([m]) => m.to), `${label} sent email`).toEqual([]);
      }
      expect(await snapshot(w.ours.workspace.id), "our workspace changed").toBe(before);

      // And the roles that may call it get past the check, so the refusals above aren't from broken arguments.
      if (entry.allowed === "admin" || entry.allowed === "member") {
        const allowed = entry.allowed === "member" ? [w.ours.member, w.ours.admin] : [w.ours.admin];
        for (const m of allowed) {
          signInAs(userOf(m));
          const outcome = await run(() => entry.call(w, ours));
          expect(outcome.how, `${m.role} was turned away`).not.toMatch(/^404$|sign-in|two-factor/);
        }
      }
      if (entry.allowed === "link") {
        signInAs(null);
        expect(await run(() => entry.allowedCall(w)), "our admin's link").toEqual({ refused: false, how: "returned" });
      }
    });
  }

  it("lists every server action", () => {
    const root = __dirname;
    const files = (function walk(dir: string): string[] {
      return readdirSync(dir).flatMap((f) => {
        const path = join(dir, f);
        return statSync(path).isDirectory() ? walk(path) : /\.tsx?$/.test(f) && !f.includes(".test.") ? [path] : [];
      });
    })(root);
    const actions = files.flatMap((file) => {
      const text = readFileSync(file, "utf8");
      if (!/^["']use server["']/.test(text.trimStart())) return [];
      return [...text.matchAll(/^export (?:async function|const|function) (\w+)/gm)].map((m) => `${relative(root, file)}#${m[1]}`);
    });
    expect(actions.sort()).toEqual(Object.keys(matrix).sort());
  });
});
