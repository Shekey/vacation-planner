# Urlaubflow

Book and plan vacations inside invite-only workspaces. See the v1 plan for scope: workspaces with admins and members, invite-only membership, vacation bookings with half days and yearly allowances, and an optional approval workflow behind a per-workspace flag.

## Before you sell: your to-do list

The code is ready for a first paying customer once these are done. They are things only you can do (accounts, contracts, money). Work through them top to bottom; the first three block selling. The bigger plan, with pricing reasoning and next features, is in [`docs/sales-plan.md`](docs/sales-plan.md).

### Monitoring: Sentry, PostHog and an uptime check

The app reports errors to **Sentry**, counts visits with **PostHog**, and has a health address for an **uptime monitor**. All three stay off until their variables are set, so local runs and previews send nothing. The privacy side is built in; please read "what is not sent" before you switch them on.

**What is not sent (by design):** the app shows employees' names and absences, so
- *Sentry* gets errors only, with emails, invite and calendar tokens, cookies, IP address, request contents and local variables removed first (`src/lib/sentry-scrub.ts`). No performance traces, no Sentry replay.
- *PostHog* runs **cookieless** (nothing stored in the browser) and **nobody is identified**: no email, no user ID. On the public pages (home, sign-in, legal) it counts visits and clicks and records session replays with every input masked. **Inside the signed-in app it only counts page views with slugs and ids removed, and records no replay**; in `/admin` and `/two-factor` nothing at all (`src/lib/analytics.ts`, with tests). Browsers that send "Do Not Track" are not counted.
- Two things differ from the generic guide you were given: no `posthog.identify(email)` (it would tie employees' emails to their browsing), and no replay of the signed-in app (names and absences are on screen).

**1. Sentry (about 10 minutes).** The wizard isn't needed; the code is already in place.
1. Create a project at sentry.io: platform *Next.js*, and choose the **EU data region** when you create the organisation (`de.sentry.io`).
2. Copy the project's **DSN** (*Settings → Client Keys*) into Vercel as `NEXT_PUBLIC_SENTRY_DSN`.
3. For readable stack traces create an *internal integration* token (*Settings → Developer Settings*, permissions *Releases: Admin* and *Organization: Read*) and set `SENTRY_AUTH_TOKEN` (secret), `SENTRY_ORG` (the org slug) and `SENTRY_PROJECT` in Vercel. The build then uploads the source maps and removes them from the deployed files.
4. Redeploy. Then open `/admin` and press **Send a test error** (server) and **Crash this page** (browser): both should appear in Sentry within a minute.

**2. PostHog (about 10 minutes).**
1. Create a project at **eu.posthog.com** (EU cloud, Frankfurt).
2. In *Project settings* turn on **Discard client IP data** (required: the browser can't do this itself) and keep **session replay** on with "mask all inputs".
3. Put the project API key into Vercel as `NEXT_PUBLIC_POSTHOG_KEY` and set `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`. To switch replay off, set `NEXT_PUBLIC_POSTHOG_REPLAY=false`.
4. Redeploy and open the landing page: a visit should show up in PostHog (*Activity*), and a replay of that visit after a few minutes. In a workspace you will only see page views like `/w/*/calendar`.

**3. Uptime check (2 minutes).** In UptimeRobot (free) or Better Stack add an HTTP monitor for `https://<your-domain>/api/health` (not the home page: this one also checks the database), interval 5 minutes, keyword `ok`, and alert your email or phone. `/api/health` returns 200 with `{"status":"ok"}` or 503.

**Launch check:** (1) the two test errors in Sentry, (2) a landing-page visit and replay in PostHog and nothing from `/admin`, (3) the monitor is green.

**Legal:** the privacy policy (`/datenschutz`) now describes both tools, and Sentry and PostHog are in the subprocessor list (PostHog only in the privacy policy, not the customer DPA, because it never sees employee data). "Cookieless" means no consent banner is needed under § 25 TDDDG, but GDPR still applies: the legal basis is legitimate interest (Art. 6(1)(f)). **Show your lawyer the new paragraphs, especially the session replay on public pages and whether the Sentry and PostHog entries and the regions are right**; I couldn't verify the providers' current data-centre locations and contract terms from here.

### Backups (about 30 minutes, then a restore drill)

A GitHub Action makes a nightly encrypted copy of the database in an EU storage bucket, outside Neon, and checks every day that the newest copy is less than 26 hours old. It needs you for things only an owner can do: a Neon plan with 7 or more days of history, the bucket and its keys as GitHub secrets, and an `age` key pair whose private half stays offline with you. Step by step, plus the restore drill and what to do when something goes wrong: [`docs/backups.md`](docs/backups.md). Once the bucket is chosen, add its provider to the subprocessor list (`src/lib/legal.ts`) and the backup to the DPA's security measures, and show both to your lawyer.

### Beta mode (free beta) and how to end it

The app starts in **beta mode**: `NEXT_PUBLIC_ENABLE_BETA_MODE` is unset or anything except `false`. In beta mode:
- Every workspace gets everything for free (all features, Teams and Slack included, no real limit on people), and there is no trial countdown, no trial emails and no checkout.
- The landing page says "Join the Free Beta", shows "100% Free during Beta · No credit card needed" under the button and replaces the price picker with the beta card and the regular prices (Team and Business, from `src/lib/plans.ts`) plus the founder discount. The FAQ answer about the trial becomes "What happens after the beta?". The footer says the app is in public beta. The terms (`/agb`) get a "Free beta phase" section instead of the 30-day trial.
- Every workspace created during the beta is marked as a **founder workspace** (`Workspace.founderRate`). The promise on the page is a permanent 50% discount on the list price, e.g. €19.50 a month for Team at the current €39.

What you must do:
1. **Check the numbers on the page.** They come from `PLANS` (Team €39, Business €89), so the founder price shows €19.50 for Team. If you had meant €29 and €69, change them in `src/lib/plans.ts`.
2. **The 50% promise needs a Stripe coupon.** In Stripe create a coupon: 50% off, duration *forever*, and put its id in Vercel as `STRIPE_FOUNDER_COUPON_ID`. Checkout then applies it automatically to founder workspaces (Stripe doesn't allow it together with a promotion-code field, so those workspaces don't get that field).
3. Show your lawyer the new beta section in `/agb` (free of charge, no availability promise, founder discount, no automatic fees). It is a promise to customers, so it must be right.
4. **Changing the flag needs a redeploy**, because Next.js bakes `NEXT_PUBLIC_` variables into the build.

**Ending the beta:**
1. Create the Stripe prices and the founder coupon, set the `STRIPE_*` variables (see Payments below) and tell the beta teams by email.
2. In Vercel set `NEXT_PUBLIC_ENABLE_BETA_MODE=false` and redeploy. New workspaces now get the normal 30-day trial; the landing page and prices switch back by themselves.
3. Open `/admin` and press **"Start the 30-day trial for beta workspaces"** once. Without it, beta workspaces would drop to Free (5 people, no Teams or Slack) the moment you switch beta mode off. It only touches workspaces that don't pay yet, keeps their founder discount, and the usual reminder emails then go out before their trial ends.

### Search engines (off until launch)

Until you launch, search engines are told to stay away: `/robots.txt` says `Disallow: /`, every page carries `noindex, nofollow` (meta tag and `X-Robots-Tag` header) and no sitemap is published. One switch controls all of it (`src/lib/indexing.ts`).

**Turning indexing on at launch:** in Vercel set `ALLOW_INDEXING=true` and redeploy (it is read at build time). robots.txt then allows the public pages (landing, legal pages, sign-in) and still blocks workspaces, invites, the API and the admin pages, which keep their own `noindex` either way. Afterwards add the domain in Google Search Console.

### After the pricing and import update

Prices are now Free ≤5, **Team €39 ≤25, Business €89 ≤75** (yearly = 10× monthly). Admins can import a whole team from Excel (*Members → Import many people from Excel*): paste cells or open a CSV, see every row checked, then add the people and, as a second step, their booked time off. People are added right away (no invitation to wait for) and optionally get an email saying where to sign in. What you must do:

1. **Create new prices in Stripe** (Team €39 monthly and €390 yearly, Business €89 monthly and €890 yearly) and put their ids into the `STRIPE_PRICE_*` variables in Vercel. The old prices can stay for anyone who already subscribed; nobody has yet.
2. **Assisted import** (the "we import your team for you" offer for bigger teams): €99 once, included with a yearly Business plan. The amount is `SETUP_SERVICE_EUR` in `src/lib/plans.ts`. Send the invoice yourself (Stripe invoice or payment link). To do the import you need to be an admin of the customer's workspace: ask them to invite your support address as admin for the day and remove you afterwards. Check with your lawyer that this fits your DPA.
3. Try the import in a test workspace with a German Excel sheet (save as CSV or copy the cells), including a few wrong rows, to see the messages.
4. Look at the pricing cards on the landing page and the Billing page: they follow `plans.ts`, plus the two new texts about import and setup help.

### After the two-factor update

Everyone on `SUPERADMIN_EMAILS` now needs a second factor to open `/admin`: after the email link they scan a QR code once with an authenticator app (1Password, Authy, Google or Microsoft Authenticator) and type a 6-digit code at each sign-in, valid for 12 hours. It is not optional. At setup they get 8 one-time recovery codes for a lost phone; 5 wrong codes lock the account for 15 minutes. Customers' sign-in is unchanged. What you must do:

1. After the deploy, each person on the list opens `/admin` once, sets up the app and **saves the recovery codes** in a password manager.
2. If someone loses both phone and recovery codes, reset them (the next sign-in starts setup again): `update "User" set "totpSecret"=null, "totpEnabledAt"=null, "totpLastStep"=null, "totpFailedCount"=0, "totpLockedUntil"=null, "recoveryHashes"='{}' where email='their@address';` in the Neon SQL editor. Check first that the request really comes from them.
3. `AUTH_SECRET` also encrypts the stored secrets. If you ever change it, every operator has to set up the second factor again (run the reset above for them).
4. Optional: tell your lawyer that operators now sign in with two factors; the DPA's list of security measures says so.

### After the super-admin update

There is now an operator area at `/admin` for you and your team. It lists all workspaces (plan, trial, people, status), lets you extend a trial, restore a workspace that was deleted in the last 30 days, and see a workspace's members while its admin has switched on "Support access" (24 hours, logged on that workspace's Activity page). Without that switch you only see plan data and the admins' contact data, never anyone's time off. What you must do:

1. In Vercel set `SUPERADMIN_EMAILS` to the email addresses of you and your team (comma separated) and redeploy. Sign in with that address as usual; a "Super admin" link appears on the workspace list. Anyone not on the list gets a 404.
2. Keep the list as short as possible and remove people who leave. Everyone on it needs two-factor sign-in (see the section above).
3. Show your lawyer the new support-access sentence in `/avv` (staff access only while the customer allows it, logged) and decide whether your support promise on the landing page needs to mention it.
4. Try it: set `SUPERADMIN_EMAILS` locally, switch on *Settings → Support access* in a test workspace, open `/admin`, and check the entry appears on the workspace's Activity page.

### After the undo and activity-log update

Customers can now undo their own mistakes: bring back a removed person (with their cancelled time off), undo a cancelled booking, and restore a deleted workspace, each for 30 days. Admins also have an *Activity* page (who removed, cancelled, approved or deleted what, kept 12 months). The database change runs by itself on the next deploy. What you must do:

1. **Check the backup window of your Neon plan** (Neon → *Settings* → *Storage* / *Restore window*). The free plan keeps only a very short history. Pick a plan with at least 7 days, and make the privacy text and DPA ("backups … 30 days") match what you really have.
2. **Keep your own copy of the database**: set up the nightly encrypted backup in [`docs/backups.md`](docs/backups.md). Neon's restore brings back the whole database at once, so it can't restore a single customer's workspace; it is your safety net for a disaster, not for customers' mistakes.
3. Show your lawyer the new *Activity log* paragraph in `/datenschutz` (legal basis, 12 months, names of the people involved) and the 30-day restore wording in the privacy text and `/avv`.
4. Try it in a test workspace: remove a person and restore them, cancel a booking and undo it, delete the workspace and restore it from the workspace list.

### After the launch-foundations update

The database change runs by itself on the next deploy. What it needs from you:

1. Make sure `CRON_SECRET` is set in Vercel. Without it the emails to admins before their trial ends (7 days and 1–2 days before) don't go out. They also need email turned on (step 3.1).
2. In Stripe, turn on failed-payment retries and emails (step 3.5). The terms now say Stripe retries and then the workspace moves to Free.
3. Set the new optional legal variables `LEGAL_REPRESENTATIVE`, `LEGAL_REGISTER` and `LEGAL_SUPERVISORY_AUTHORITY` (step 2, table below).
4. Decide whether you refund the rest of the period when a paying customer deletes their workspace. The app stops the renewal at once (the plan runs to the end of the paid period, so a restore within the 30 days brings it back) and cancels the subscription when the workspace is deleted for good; Stripe refunds nothing by default (step 2, last row of the table).
5. Try it: create a test workspace, click "Fill with a sample team" on the overview, look at the calendar, then "Remove sample team".

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
| AGB | Refunds when a workspace is deleted mid-period (the app stops the renewal at once and cancels when the workspace is purged after 30 days; Stripe refunds nothing by default) | Decide, then ask the lawyer to add it |

### 3. Turn on email and payments (blocks selling)

1. **Resend**: add your domain (*Domains* → *Add domain*), put the DNS records it shows at your domain provider, wait for "Verified", then set `EMAIL_FROM` to an address on that domain (e.g. `Urlaubflow <hallo@urlaubflow.de>`).
2. **Stripe**: activate your account (company details, bank account), then follow [Payments (Stripe)](#payments-stripe) below with the **new prices** (Team €39 / €390, Business €89 / €890).
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

1. **Import the repo** at vercel.com/new and pick `Shekey/vacation-planner`. The framework is detected; leave build settings as they are. The `vercel-build` script builds the app and then runs database migrations, so a failed build never touches the database. The first deploy fails with "No database URL is set" because there is no database yet; that is expected. Preview deploys never migrate, because they normally share the production database: a migration in an unmerged pull request must not change it. A preview of a pull request with a new migration runs against the old schema, so pages that need the new columns fail there until it is merged; to try migrations on previews, give Preview its own database (a Neon branch) and set `MIGRATE_ON_PREVIEW=1` for Preview only.
2. **Add a database**: in the Vercel project, open *Storage* → *Create Database* → *Neon* (Postgres) and connect it to the project. Tick all environments (Development, Preview, Production). This sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` (or `POSTGRES_URL` and `POSTGRES_URL_NON_POOLING`, both work) for you. Leave the custom prefix empty.
3. **Set environment variables** (*Settings* → *Environment Variables*):
   | Name | Value |
   |---|---|
   | `AUTH_SECRET` | output of `npx auth secret` (or any long random string) |
   | `AUTH_RESEND_KEY` | API key from resend.com |
   | `EMAIL_FROM` | e.g. `Urlaubflow <hallo@urlaubflow.de>` (a domain verified in Resend) |
   | `CRON_SECRET` | any long random string (enables the weekday Teams/Slack digest and the emails to admins before their trial ends) |
   Don't set `AUTH_URL` on Vercel unless you add a custom domain; then set it to exactly that address (e.g. `https://vacations.yourcompany.com`). A wrong `AUTH_URL` sends sign-in links and redirects to another site.
4. **Redeploy** so the variables apply. Open the site, sign in with your email and create your workspace.

### Payments (Stripe)

Billing stays off until these are set; the Billing page then says to write to the support address instead.

1. In Stripe, create two products, **Team** and **Business**, each with a monthly and a yearly recurring price (net prices: Team €39 / month and €390 / year, Business €89 / month and €890 / year; they must match `src/lib/plans.ts`).
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
| `npm run test:db` | Tests against a real Postgres (`*.db.test.ts`: bookings, approvals, allowance and carry-over, members, invitations, Stripe sync). Needs `DATABASE_URL` pointing at a throwaway database with migrations applied; CI runs them on every PR |
| `npm run db:migrate` | Create/apply migrations in development |
| `npm run db:deploy` | Apply migrations in CI/production |

## Database changes

The old deploy keeps serving requests while a new one builds and migrates, and a deploy can be rolled back in Vercel without rolling back the database. So every migration must work with the code before it and after it (expand, then contract):

1. **Expand** (one PR): add the new column or table, nullable or with a default; the code writes both and reads the new one. Copy old data over in the migration if needed.
2. **Contract** (a later PR, after the first is live): drop or rename the old column or table.

Never rename or drop in the same PR that stops using the column. A rename is an add, a copy and a later drop. Migrations that are already merged are never edited; add a new one.

The *Migrations* check (`scripts/check-migrations.mjs`) fails a PR whose new migrations contain `DROP COLUMN`, `DROP TABLE` or `RENAME`, or that changes or removes an existing migration. For the contract PR, add the label `breaking-migration`.

To try a migration on real-shaped data before it reaches production, give Vercel's Preview environment its own Neon branch and set `MIGRATE_ON_PREVIEW=1` for Preview only (see Deploy above). Backups and restore: [`docs/backups.md`](docs/backups.md).

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
