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

## Deploy on Vercel

1. **Import the repo** at vercel.com/new and pick `Shekey/vacation-planner`. The framework is detected; leave build settings as they are. The `vercel-build` script runs database migrations before every build. The first deploy fails with "No database URL is set" because there is no database yet; that is expected. Preview deploys without their own database still build, but skip migrations and can't sign anyone in.
2. **Add a database**: in the Vercel project, open *Storage* → *Create Database* → *Neon* (Postgres) and connect it to the project. Tick all environments (Development, Preview, Production). This sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` (or `POSTGRES_URL` and `POSTGRES_URL_NON_POOLING`, both work) for you. Leave the custom prefix empty.
3. **Set environment variables** (*Settings* → *Environment Variables*):
   | Name | Value |
   |---|---|
   | `AUTH_SECRET` | output of `npx auth secret` (or any long random string) |
   | `AUTH_RESEND_KEY` | API key from resend.com |
   | `EMAIL_FROM` | e.g. `Vacation Planner <vacations@yourdomain.com>` (a domain verified in Resend) |
   | `CRON_SECRET` | any long random string (enables the weekday Teams digest) |
   Don't set `AUTH_URL` on Vercel unless you add a custom domain; then set it to exactly that address (e.g. `https://vacations.yourcompany.com`). A wrong `AUTH_URL` sends sign-in links and redirects to another site.
4. **Redeploy** so the variables apply. Open the site, sign in with your email and create your workspace.

### Payments (Stripe)

Billing stays off until these are set; the Billing page then says to write to the support address instead.

1. In Stripe, create two products, **Team** and **Business**, each with a monthly and a yearly recurring price (net prices: €15 / €150 and €35 / €350).
2. Add a webhook endpoint `https://<your-domain>/api/stripe/webhook` with the events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` and `customer.subscription.deleted`.
3. Turn on the Customer Portal (*Settings* → *Billing* → *Customer portal*) and allow switching between the four prices, cancelling and invoice history.
4. Set the variables:
   | Name | Value |
   |---|---|
   | `STRIPE_SECRET_KEY` | secret key (`sk_live_…`, or `sk_test_…` for testing) |
   | `STRIPE_WEBHOOK_SECRET` | signing secret of the webhook endpoint (`whsec_…`) |
   | `STRIPE_PRICE_TEAM_MONTHLY`, `STRIPE_PRICE_TEAM_YEARLY`, `STRIPE_PRICE_BUSINESS_MONTHLY`, `STRIPE_PRICE_BUSINESS_YEARLY` | the price ids (`price_…`) |
   | `STRIPE_AUTOMATIC_TAX` | `1` once Stripe Tax is set up, so VAT is added per customer country |

New workspaces get a 30-day trial with everything for up to 50 people, then fall back to Free (5 people, no Teams or Slack) unless they subscribe.

### Legal pages

`/impressum`, `/datenschutz`, `/agb` and `/avv` read the operator's details from `LEGAL_NAME`, `LEGAL_ADDRESS`, `LEGAL_EMAIL`, and optionally `LEGAL_PHONE`, `LEGAL_VAT_ID` and `LEGAL_RESPONSIBLE`. They show a draft notice until `LEGAL_REVIEWED=1`; have a lawyer check the texts first. Subprocessors are listed in `src/lib/legal.ts`.

Without a verified domain, Resend only delivers to the email address of your Resend account, which is enough to try it yourself. Verify a domain in Resend before inviting the team. While `EMAIL_FROM` is unset or on `resend.dev`, the Members page shows a warning, and invites that Resend rejects say so instead of reporting success.

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
- **People search**: type a name to see whether someone is out today and their upcoming time off.
- **Microsoft Teams**: optional channel webhook (Teams Workflows "Post to a channel when a webhook request is received") that posts bookings, requests and approvals as Adaptive Cards, plus a weekday-morning "who's out today" digest.
- **Team calendar** (month view, click a day to book), an overview with who's out today and the next two weeks, and email notifications for invites, requests and decisions.

## Notes

- Migrations add constraints Prisma can't express: `endDate >= startDate`, and an exclusion constraint (in half-day units, via `booking_halfday_range`) so one member can't have overlapping pending/approved bookings. Keep them when editing migrations.
- Outside Vercel, set `AUTH_URL` in production so links in emails use the right domain. On Vercel the production domain is used automatically.
- Workspace pages respond 404 to non-members so workspaces can't be discovered by slug.
