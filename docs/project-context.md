# Vacation Planner: project context

A snapshot of how this app was planned and built, so a later session (human or Claude) can pick it up without the original chat. Exported 2026-10-02.

To continue work in a new Claude session, point it at this file: "Read docs/project-context.md first."

## What it is

A multi-tenant web app where people book vacation inside a workspace (a team). Admins invite members; nobody joins without an invite. Live at https://vacation-planner-lyart.vercel.app (Vercel + Neon Postgres).

## Decisions (from Ajdin)

- Workspace = team. No nested sub-teams.
- Admin invites only. Anyone can sign in and create their own workspace.
- Yearly allowance is tracked, with days left shown. Half-day bookings are allowed.
- Approval workflow is an optional per-workspace flag. Admin-created bookings skip approval.
- Stack: Next.js (App Router) + TypeScript, Postgres + Prisma, Auth.js magic links via Resend.
- Notifications go to Microsoft Teams (webhook), not Slack.
- No CSV export.
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

## Where things live

- Schema: `prisma/schema.prisma`, migrations in `prisma/migrations/`.
- Day counting and allowance: `src/lib/booking-days.ts`, `src/lib/bookings.ts` (`regionOf`, `loadHolidays`, `allowanceSummary`).
- Holidays: `src/lib/holidays.ts` (Nager parser), `src/lib/holiday-regions.ts` (country and region lists), `src/lib/holiday-import.ts`.
- Tips: `src/lib/smart-days.ts`.
- Pages: `src/app/w/[slug]/` (overview, book, calendar, approvals, members, people, holidays, settings, me).
- Crons (`vercel.json`): `/api/cron/daily-digest` weekdays 06:00, `/api/cron/holidays` monthly. Both need `CRON_SECRET`.
- Build: `scripts/vercel-build.mjs` migrates on production, skips migrations on preview.

## Deploy notes

- Env vars: a Postgres URL (`DATABASE_URL` or Neon's `POSTGRES_*`), `AUTH_SECRET`, `AUTH_RESEND_KEY`, `EMAIL_FROM`, `CRON_SECRET`. See `README.md`.
- Leave `AUTH_URL` unset on Vercel; the app uses the production domain. Never use `vacation-planner.vercel.app`: that is someone else's site.
- Never run `prisma migrate reset` against a real database.

## Open items

- Confirm sign-in works on the live site after removing `AUTH_URL`.
- Try Holidays → Germany → Import on the live site (it couldn't be tested from the build sandbox).
- Known quirk: a new member gets carry-over as if they had an unused previous year.
- Ideas not built yet: undo after cancel, day-before reminder, admin view of who has the most days left, calendar filter, range selection on the calendar.
