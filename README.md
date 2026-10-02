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

## Notes

- The initial migration adds two constraints Prisma can't express: `endDate >= startDate`, and an exclusion constraint so one member can't have overlapping pending/approved bookings. Keep them when editing migrations.
- Workspace pages respond 404 to non-members so workspaces can't be discovered by slug.
