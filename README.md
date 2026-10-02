# Vacation Planner

Book and plan vacations inside invite-only workspaces. See the v1 plan for scope: workspaces with admins and members, invite-only membership, vacation bookings with half days and yearly allowances, and an optional approval workflow behind a per-workspace flag.

## Stack

Next.js (App Router, TypeScript) · PostgreSQL + Prisma · Auth.js email magic links (Resend) · Tailwind · Vitest

## Getting started

```bash
cp .env.example .env          # then set AUTH_SECRET (npx auth secret)
npm install                   # also generates the Prisma client
npm run db:migrate            # needs a running Postgres at DATABASE_URL
npm run dev
```

Without `AUTH_RESEND_KEY`, sign-in links are printed to the dev server console instead of emailed.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run lint` / `npm run typecheck` / `npm test` | Checks run in CI |
| `npm run db:migrate` | Create/apply migrations in development |
| `npm run db:deploy` | Apply migrations in CI/production |

## What's in it

- **Workspaces** with admins and members. Anyone can create a workspace; others join only through an emailed invite (7-day link, single use, must match the invited email).
- **Bookings**: vacation, sick leave or other, with half days (morning/afternoon). Weekends aren't counted unless the workspace says so. A member can't double-book, but a morning and an afternoon can share a date.
- **Yearly allowance** per member (default set per workspace), with days taken, pending and left shown while booking.
- **Approvals** behind a per-workspace switch. With it on, members' bookings wait for an admin; admins' own bookings are confirmed. Switching it off approves everything pending.
- **Public holidays** per workspace: import a country's from date.nager.at or add days by hand. They're skipped when counting days off.
- **Carry-over**: up to a set number of unused vacation days roll into the next year.
- **Minimum staffing**: booking and approval screens warn when fewer than N people would be in.
- **Calendar feed**: each member can get a private iCal link to subscribe to the team calendar in Google Calendar, Outlook or Apple Calendar.
- **Slack**: optional incoming webhook that posts bookings, requests and approvals to a channel.
- **Team calendar** (month view, click a day to book), an overview with who's out today and the next two weeks, and email notifications for invites, requests and decisions.

## Notes

- Migrations add constraints Prisma can't express: `endDate >= startDate`, and an exclusion constraint (in half-day units, via `booking_halfday_range`) so one member can't have overlapping pending/approved bookings. Keep them when editing migrations.
- Set `AUTH_URL` in production so links in emails use the right domain.
- Workspace pages respond 404 to non-members so workspaces can't be discovered by slug.
