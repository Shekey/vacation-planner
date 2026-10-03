# Vacation Planner: project context

A snapshot of how this app was planned and built, so a later session (human or Claude) can pick it up without the original chat. Exported 2026-10-02.

To continue work in a new Claude session, point it at this file: "Read docs/project-context.md first."

## What it is

A multi-tenant web app where people book vacation inside a workspace (a team). Admins invite members; nobody joins without an invite. Live at https://vacation-planner-lyart.vercel.app (Vercel + Neon Postgres).

## Decisions (from Ajdin)

- Workspace = team. No nested sub-teams.
- Admin invites only. Anyone can sign in and create their own workspace.
- Yearly allowance is tracked, with days left shown. Half-day bookings are allowed.
- Carry-over (Ajdin, 2026-10-03): per-workspace max days plus an optional "must be taken by" day (`carryOverExpiry`, "MM-DD"). Carried days are used first; what's left of them after that day expires (`carriedOverStatus` in `src/lib/booking-days.ts`).
- Approval workflow is an optional per-workspace flag. Admin-created bookings skip approval.
- Stack: Next.js (App Router) + TypeScript, Postgres + Prisma, Auth.js magic links via Resend.
- Notifications go to Microsoft Teams (webhook); Slack was added as an option in round 2 (2026-10-03).
- Data minimization (Ajdin, 2026-10-03): no sick leave and no free-text notes are stored, to keep legal exposure low; bookings are deleted 3 years after they end (`src/lib/retention.ts`, run by the monthly holidays cron).
- Payments: Stripe (Ajdin chose it over Paddle, 2026-10-03). Flat team prices: Free ≤5, Team €15 ≤20, Business €35 ≤50.
- No CSV export.
- Languages (Ajdin, 2026-10-03): English and German everywhere, picked by the user. First visit follows the browser language, falling back to English. EN/DE switch in the header (landing and app) and on the profile page; saved on the profile when signed in, in a `lang` cookie otherwise. The app UI uses informal "du". Legal pages: German is binding, English is a convenience translation (`?lang=de` / `?lang=en` switches one page).
- Public holidays come per country with a region (ISO 3166-2, e.g. `DE-BE`). Each person picks their own region; the workspace has a default. Focus is Germany: Berlin = `DE-BE`, Bielefeld = North Rhine-Westphalia = `DE-NW`.

## What's built

| PR | Contents |
|---|---|
| #1 | Skeleton: Next.js 16, Prisma 7 + pg adapter, Auth.js magic links, workspaces |
| #2 | Invites, bookings with half days, allowances, team calendar, approvals flag, settings, emails |
| #3 | Public holidays (date.nager.at import), carry-over cap, minimum staffing warning, iCal feed, Microsoft Teams webhook |
| #4 | Vercel deploy (build runs migrations, daily digest cron), People search, display names, mobile and dark mode polish |
| #5 | Database URL under any Vercel/Neon name, preview builds without a database, sign-in errors shown on /sign-in |
| #6 | Long-weekend tips, use-it-or-lose-it nudge, regional holidays picked per person, monthly holiday refresh cron |
| #7 | Public landing page at `/` for signed-out visitors (`src/app/landing.tsx`), accessibility pass (skip link, focus ring, labels, announced form messages, calendar readable by screen readers), Settings can apply the default allowance to existing members |
| #8 | Security hardening (headers, sign-in throttle, 1-hour magic links, safe redirects, constant-time cron check) and a refreshed look for the signed-in app (theme tokens, overview tiles, avatars) |
| #9 | Part-time work days and employment start date per member (Members → "Work days"), allowance pro-rated 1/12 per full month in the start year, no carry-over from a year before someone joined, sick leave shown as "Other" to colleagues (Settings toggle, default on), download my data, delete my account, delete workspace |
| #11 | Plans and Stripe billing (Free up to 5, Team €15 up to 20, Business €35 up to 50; 30-day trial with everything; over the limit new bookings and invites stop), Billing page with Checkout and Customer Portal, Stripe webhook, Slack webhook next to Teams, getting-started checklist, invites from pasted Excel/Outlook rows, German legal pages (Impressum, Datenschutz, AGB, AVV) with footer links, pricing on the landing page, data-light mode: no sick-leave type, no booking notes, approval notes only emailed, monthly purge of bookings 3 years after they end, of removed members after 3 years and of finished invitations after 30 days |
| #12 | Carry-over deadline: admins pick a day (e.g. 31 March) by which carried-over days must be taken; they are used first and the rest expires after it. Overview nudges before the deadline, the allowance card shows what expired |
| #13 | English and German everywhere: browser-language detection, EN/DE switch in the header and on the profile, choice saved on the profile or in a cookie; translated landing, app, emails, Teams/Slack posts, iCal feed; English convenience translation of the legal pages (German binding); workspace language setting for chat and emails; English holiday names stored next to local ones |

## Where things live

- Translations: `src/lib/i18n/` (`config.ts` languages and detection, `messages/<namespace>.ts` one file per area with `en` and `de`, `server.ts` `getLocale()`/`getMessages()` for server code, `index.ts` `messagesFor(locale)`), `useI18n()` in `src/components/i18n-provider.tsx` for client components. A test checks German has every English key. Emails go out in the recipient's saved language, else the workspace language; Teams/Slack posts, the daily digest and holiday-import errors use the workspace language (Settings, `WorkspaceSettings.locale`, set from the creator's language). Holidays keep the local name in `name` and the English one in `englishName` (`holidayName()` in `src/lib/holidays.ts`); older imports get the English name on the next monthly refresh or re-import.
- Schema: `prisma/schema.prisma`, migrations in `prisma/migrations/`.
- Day counting and allowance: `src/lib/booking-days.ts` (`proratedAllowance`, work days in `DayRules`), `src/lib/bookings.ts` (`regionOf`, `rulesFor`, `forViewer`, `loadHolidays`, `allowanceSummary`).
- Plans and billing: `src/lib/plans.ts` (`accessOf`, limits), `src/lib/stripe.ts`, `/api/stripe/webhook`, `/w/[slug]/billing`. Chat is dropped in `settingsOf` when the plan has none.
- Chat posts: `src/lib/notify.ts` sends to `src/lib/teams.ts` and `src/lib/slack.ts`.
- Legal texts: `src/app/(legal)/`, operator details and subprocessors in `src/lib/legal.ts` (env `LEGAL_*`).
- Account export and deletion: `src/lib/account.ts`, `/api/account/export`, `/account`.
- Holidays: `src/lib/holidays.ts` (Nager parser), `src/lib/holiday-regions.ts` (country and region lists), `src/lib/holiday-import.ts`.
- Tips: `src/lib/smart-days.ts`.
- Pages: `src/app/w/[slug]/` (overview, book, calendar, approvals, members, people, holidays, settings, me).
- Crons (`vercel.json`): `/api/cron/daily-digest` weekdays 06:00, `/api/cron/holidays` monthly. Both need `CRON_SECRET`.
- Build: `scripts/vercel-build.mjs` migrates on production, skips migrations on preview.
- Security: headers in `next.config.ts`; helpers in `src/lib/security.ts`; magic-link throttle (3 per address per 10 min) in `src/lib/sign-in-limit.ts`.
- Look: theme tokens (`background`, `surface`, `muted`, `border`, `primary`) and `.btn`, `.btn-secondary`, `.card`, `.card-link` in `src/app/globals.css`; `Avatar`, `LogoMark`, `EmptyState` in `src/components/ui.tsx`.

## Deploy notes

- Env vars: a Postgres URL (`DATABASE_URL` or Neon's `POSTGRES_*`), `AUTH_SECRET`, `AUTH_RESEND_KEY`, `EMAIL_FROM`, `CRON_SECRET`. See `README.md`.
- Leave `AUTH_URL` unset on Vercel; the app uses the production domain. Never use `vacation-planner.vercel.app`: that is someone else's site.
- Emails reach real people only after a domain is verified in Resend and `EMAIL_FROM` uses it; with `onboarding@resend.dev` Resend delivers only to the Resend account owner (seen 2026-10-03).
- Never run `prisma migrate reset` against a real database.

## Open items

- Selling it: plan in the Claude Doc "Vacation Planner: plan for selling it" (pricing, billing, GDPR, launch).
- Selling readiness and next rounds: Claude Doc "Vacation Planner: ready to sell? Next plan" (https://claude.ai/code/artifact/9d88c5b7-44ae-4c4a-9f0c-58e448840141). Round 1 is PR #9.
- EU hosting (Neon and Vercel functions in Frankfurt): Ajdin will do this last; build as if it is done.
- Carry-over for someone who joined the app mid-year but was employed earlier comes from their app bookings only; set their start date and adjust the allowance if needed.
- Ideas not built yet: undo after cancel, day-before reminder, admin view of who has the most days left, calendar filter, range selection on the calendar.
