# Vacation Planner

Book and plan vacations inside invite-only workspaces. See the v1 plan for scope: workspaces with admins and members, invite-only membership, vacation bookings with half days and yearly allowances, and an optional approval workflow behind a per-workspace flag.

## Before you sell: your to-do list

The code is ready for a first paying customer once these are done. They are things only you can do (accounts, contracts, money). Work through them top to bottom; the first three block selling. The bigger plan, with pricing reasoning and next features, is in [`docs/sales-plan.md`](docs/sales-plan.md).

### 1. Move hosting to Frankfurt (blocks selling)

The privacy policy, the DPA (`/avv`) and the landing page already say data is stored in Frankfurt. Until it is, that statement is false.

1. **Neon**: create a new project in region *AWS Europe Central 1 (Frankfurt)*. Neon can't move a project, so copy the data: `pg_dump "$OLD_URL" | psql "$NEW_URL"` (run it from your computer with both URLs from the Neon dashboard), or start empty if nobody uses it yet.
2. In Vercel → *Storage*, connect the new Neon database and disconnect the old one, so `DATABASE_URL` points to Frankfurt.
3. **Vercel functions**: *Settings* → *Functions* → *Function Region* → `fra1` (Frankfurt).
4. Redeploy, sign in and check that your workspace is there.

### 2. Fill in the legal details and get them checked (blocks selling)

1. In Vercel → *Environment Variables* set `LEGAL_NAME`, `LEGAL_ADDRESS`, `LEGAL_EMAIL` and, if you have them, `LEGAL_PHONE`, `LEGAL_VAT_ID` (USt-IdNr.) and `LEGAL_RESPONSIBLE`.
2. Register your business (Gewerbeanmeldung) if you haven't, and get a USt-IdNr. from the Bundeszentralamt für Steuern so business customers in other EU countries can be billed with reverse charge.
3. Fill in the rest of the gaps below, then have a lawyer (IT law, e.g. via your IHK or a fixed-price service) review `/impressum`, `/datenschutz`, `/agb` and `/avv`. Ask them about the claims on the landing page too ("cancel any time", support promises).
4. Set `LEGAL_REVIEWED=1` and redeploy. The draft notice disappears.

**Only a lawyer can confirm the four pages are legally sound.** The code keeps them true to what the app does (checked 2026-10-17: cookies, stored data, deletion after 3 years, what happens when the trial or a plan ends), but it can't judge whether they are complete or enforceable. What you must fill in or decide, and what to ask the lawyer:

| Page | Missing or open | What to do |
|---|---|---|
| All | Operator name, address, email | `LEGAL_NAME`, `LEGAL_ADDRESS`, `LEGAL_EMAIL` (placeholders like `[Name or company]` show until then) |
| Impressum (§ 5 DDG) | Legal form and representative (e.g. "UG (haftungsbeschränkt), vertreten durch …") | `LEGAL_REPRESENTATIVE`; leave empty as a sole trader |
| Impressum | Commercial register and number, if registered | `LEGAL_REGISTER`, e.g. `Amtsgericht Bielefeld, HRB 12345` |
| Impressum | A second fast way to reach you besides email | `LEGAL_PHONE` (recommended) |
| Impressum | USt-IdNr. | `LEGAL_VAT_ID` once you have it |
| Impressum | Whether "§ 18 Abs. 2 MStV" and the consumer-dispute sentence are needed for a B2B tool | Ask the lawyer |
| Datenschutz | Your data protection authority (that of your federal state, e.g. LDI NRW for Bielefeld) | `LEGAL_SUPERVISORY_AUTHORITY` with name and address |
| Datenschutz | "Server logs kept at most 30 days" | Check your Vercel plan's log retention and correct the sentence if needed |
| Datenschutz, AVV | "Hosting in Frankfurt" | Only true after step 1 above |
| Datenschutz, AVV | "Deleted from backups after 30 days" | Check the history/restore window of your Neon plan and correct it if needed |
| Datenschutz | Whether you need a data protection officer, and whether the right to object (Art. 21) must be shown separately | Ask the lawyer |
| Datenschutz, AVV | Microsoft and Slack are listed as *our* subprocessors, but posts go to the customer's own Teams/Slack channel | Ask the lawyer whether they belong in the list |
| AVV (Art. 28) | The technical and organisational measures (TOMs) are a short list | Write the TOM annex (step 5.1 below) and have it attached to the AVV |
| AVV | Liability, place of processing for support access from the USA, and who signs | Ask the lawyer; bigger customers may want a signed AVV |
| AGB | "Stripe retries a failed payment" | In Stripe's Billing settings (*Revenue recovery*), turn on retries and the customer emails about failed payments, and set "if all retries fail" to cancel the subscription |
| AGB | Refunds when a workspace is deleted mid-period (the app cancels the subscription at once, Stripe refunds nothing by default) | Decide, then ask the lawyer to add it |

### 3. Turn on email and payments (blocks selling)

1. **Resend**: add your domain (*Domains* → *Add domain*), put the DNS records it shows at your domain provider, wait for "Verified", then set `EMAIL_FROM` to an address on that domain (e.g. `Vacation Planner <hallo@your-domain.de>`).
2. **Stripe**: activate your account (company details, bank account), then follow [Payments (Stripe)](#payments-stripe) below with the **new prices** (Team €29 / €290, Business €69 / €690).
3. In Stripe → *Settings* → *Payment methods* turn on **SEPA Direct Debit** (the landing page promises it; practices and trades often don't pay by card). Optionally turn on *Invoices* (pay by bank transfer) for bigger customers.
4. In Stripe → *Tax* set up Stripe Tax with your German address and VAT number, then set `STRIPE_AUTOMATIC_TAX=1`.
5. In Stripe's Billing settings (*Revenue recovery*) turn on retries and the customer emails about failed payments, and let Stripe cancel the subscription when all retries fail. The workspace then moves to Free by itself, and the terms (`/agb`) describe exactly that.
6. Test once in test mode: subscribe, cancel in the Customer Portal (the Billing page should say "cancelled, runs until …"), and check the workspace's Billing page follows.

### 4. Get a custom domain

1. Buy a `.de` domain (e.g. at INWX, Hetzner or Strato), add it in Vercel → *Settings* → *Domains*, and set `AUTH_URL` to exactly that address.
2. Use the same domain for Resend (step 3) and for `LEGAL_EMAIL`.

### 5. Prepare for the first customers

1. Write a one-page **TOM** (technical and organisational measures) PDF from the list in `/avv`; practices and care services will ask for it.
2. Write a short **information sheet for works councils**: what is stored (dates, type vacation/other, no sick days, no notes), who sees it, deletion after 3 years, no performance monitoring. Bigger customers with a Betriebsrat need it before they may start.
3. Make a support address that you actually read, and decide what "priority support" (Business) means for you, e.g. answer within one working day.
4. Take 3 screenshots (overview, calendar, booking on a phone) for the landing page, Google Business profile and LinkedIn.
5. Ask 3 to 5 friendly businesses (a practice, a care service, a trades business) to use it for free for 3 months in return for honest feedback and, if they like it, a quote you may put on the landing page. Only add real quotes.

### 6. Start selling

Follow the launch steps in [`docs/sales-plan.md`](docs/sales-plan.md#5-how-to-find-customers): local practices and care services first, then industry directories and partners such as tax advisors.

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
   | `CRON_SECRET` | any long random string (enables the weekday Teams/Slack digest and the emails to admins before their trial ends) |
   Don't set `AUTH_URL` on Vercel unless you add a custom domain; then set it to exactly that address (e.g. `https://vacations.yourcompany.com`). A wrong `AUTH_URL` sends sign-in links and redirects to another site.
4. **Redeploy** so the variables apply. Open the site, sign in with your email and create your workspace.

### Payments (Stripe)

Billing stays off until these are set; the Billing page then says to write to the support address instead.

1. In Stripe, create two products, **Team** and **Business**, each with a monthly and a yearly recurring price (net prices: Team €29 / month and €290 / year, Business €69 / month and €690 / year; they must match `src/lib/plans.ts`).
2. Add a webhook endpoint `https://<your-domain>/api/stripe/webhook` with the events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` and `customer.subscription.deleted`.
3. Turn on the Customer Portal (*Settings* → *Billing* → *Customer portal*) and allow switching between the four prices, cancelling and invoice history.
4. Set the variables:
   | Name | Value |
   |---|---|
   | `STRIPE_SECRET_KEY` | secret key (`sk_live_…`, or `sk_test_…` for testing) |
   | `STRIPE_WEBHOOK_SECRET` | signing secret of the webhook endpoint (`whsec_…`) |
   | `STRIPE_PRICE_TEAM_MONTHLY`, `STRIPE_PRICE_TEAM_YEARLY`, `STRIPE_PRICE_BUSINESS_MONTHLY`, `STRIPE_PRICE_BUSINESS_YEARLY` | the price ids (`price_…`) |
   | `STRIPE_AUTOMATIC_TAX` | `1` once Stripe Tax is set up, so VAT is added per customer country |

New workspaces get a 30-day trial with everything for up to 75 people, then fall back to Free (5 people, no Teams or Slack) unless they subscribe.

### Legal pages

`/impressum`, `/datenschutz`, `/agb` and `/avv` read the operator's details from `LEGAL_NAME`, `LEGAL_ADDRESS`, `LEGAL_EMAIL`, and optionally `LEGAL_PHONE`, `LEGAL_VAT_ID`, `LEGAL_RESPONSIBLE`, `LEGAL_REPRESENTATIVE`, `LEGAL_REGISTER` and `LEGAL_SUPERVISORY_AUTHORITY`. They show a draft notice until `LEGAL_REVIEWED=1`; have a lawyer check the texts first. Subprocessors are listed in `src/lib/legal.ts`.

Without a verified domain, Resend only delivers to the email address of your Resend account, which is enough to try it yourself. Verify a domain in Resend before inviting the team. While `EMAIL_FROM` is unset or on `resend.dev`, the Members page shows a warning, and invites that Resend rejects say so instead of reporting success.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run lint` / `npm run typecheck` / `npm test` | Checks run in CI |
| `npm run db:migrate` | Create/apply migrations in development |
| `npm run db:deploy` | Apply migrations in CI/production |

## What's in it

- **Guided setup**: a new workspace asks for the kind of team (practice, care, Kita, trades, restaurant, office), which sets approvals and a typical allowance, and imports public holidays for the chosen country and state right away.
- **Workspaces** with admins and members. Anyone can create a workspace; others join only through an emailed invite (7-day link, single use, must match the invited email).
- **Bookings**: vacation or other time off (no sick leave, see `docs/sales-plan.md`), with half days (morning/afternoon). Weekends aren't counted unless the workspace says so. A member can't double-book, but a morning and an afternoon can share a date.
- **Yearly allowance** per member (default set per workspace), with days taken, pending and left shown while booking. Changing it keeps last year's value, so carry-over doesn't change after the fact.
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
