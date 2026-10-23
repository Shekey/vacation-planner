# Moving from Vercel to Cloudflare

Status: **proposal**. Tracked in [#148](https://github.com/Shekey/vacation-planner/issues/148).

This document gives **suggestions, not decisions**. Every open choice is marked **DECISION** with options and a leaning; every known hazard is marked **RISK**. Whoever implements this (person or agent) should verify the facts marked *(verify)* against current vendor docs, decide each DECISION, and record the choice and reason in the "Decision log" at the bottom.

## Context

- The app is in beta with **no real users and no production data to keep**. That makes a database rewrite much cheaper than it would be later.
- The goals are **long-term efficiency and low running cost**, plus **GDPR compliance with data in Germany where possible**, and a `develop` (staging) + `main` (production) workflow.
- Ease of staying on Vercel is explicitly *not* a goal.

## Suggested target stack

| Area | Suggestion | Alternatives |
| --- | --- | --- |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare`, Workers Paid ($5/month) | Stay on Vercel; Hetzner VPS (Germany) with Docker |
| Database | Cloudflare D1 (SQLite), EU jurisdiction | Neon Postgres in Frankfurt + Hyperdrive (keeps Prisma) |
| ORM | Drizzle | Prisma with `@prisma/adapter-d1` |
| Files / backups | R2, EU jurisdiction | Hetzner Object Storage (Germany) |
| Outbound email | Resend (EU region if available) | A German/EU provider |
| Inbound email | Cloudflare Email Routing, only if needed | Mail provider's forwarding |
| Scheduled jobs | Workers Cron Triggers | — |
| Errors / analytics | Sentry EU region; PostHog EU (already `eu.i.posthog.com`) | Self-host |

## What $5/month buys on Cloudflare *(verify current numbers)*

- **Workers Paid:** 10M requests and 30M CPU-ms per month, up to 5 minutes of CPU per request, 10 MB bundle, and 1000 subrequests per request.
- **D1:** 25B rows read and 50M rows written per month, 5 GB storage included (10 GB maximum per database), and 30 days of Time Travel restore.
- **Also included:** Cron Triggers, KV, Queues, Durable Objects and Hyperdrive.
- **R2 (billed separately):** 10 GB free and no egress fees.

For a leave-planning app this is far above expected load. Resend's free plan (100 emails/day, 3,000/month) is the first limit we're likely to hit.

## GDPR and "data in Germany"

Facts to work from *(verify all)*:

- **Cloudflare can't pin data to Germany specifically** on self-serve plans.
  - D1 offers an **EU jurisdiction** and location hints such as `weur` (Western Europe).
  - R2 offers an **EU jurisdiction**.
  - The jurisdiction guarantees the EU, not Germany.
- **Workers compute runs in every Cloudflare data centre worldwide.** A request from the US is processed in the US, even when the stored data stays in the EU. Keeping processing inside the EU needs the Data Localization Suite (Enterprise only).
- **Cloudflare, Resend, Sentry and Stripe are US companies.** They rely on the EU–US Data Privacy Framework plus a DPA/SCCs. That's legal today but has been struck down twice before (Safe Harbor, Privacy Shield).
- **German-company options** (Hetzner for servers/storage, German email providers) would give "everything in Germany" but give up most of the Cloudflare efficiency.

**DECISION G1 — how strict is "Germany"?**

- **(a) EU data residency with US processors under DPF + DPA.** Cloudflare D1/R2 in the EU jurisdiction, Resend/Sentry/PostHog EU regions. *Leaning: (a).* This is common practice and compatible with the Cloudflare plan.
- **(b) Stored data in Germany.** Neon in Frankfurt plus Hetzner storage. Hosting can still be on Cloudflare.
- **(c) Everything at German companies.** Hetzner VPS plus a German email provider. This means no Cloudflare.

**GDPR tasks, whatever is chosen:**

- [ ] Sign/accept a DPA with every processor (Cloudflare, Resend, Sentry, PostHog, Stripe, Neon if kept).
- [ ] List every processor, with location and transfer mechanism, in the privacy policy and in the record of processing activities.
- [ ] Create D1 databases with the EU jurisdiction and R2 buckets EU-only. Note: the jurisdiction can't be changed after creation *(verify)*.
- [ ] Keep Sentry PII scrubbing (`src/lib/sentry-scrub*`) working on the new runtime. Keep PostHog on the EU host.
- [ ] Keep retention/deletion (`src/lib/retention.ts`) and account deletion working. Check that D1 Time Travel and backups expire within the documented retention period.
- [ ] Turn off or anonymise Cloudflare Web Analytics/logging that stores IPs, or mention it in the privacy policy.

## DECISION D1 — database

**Options:**

- **(a) D1 + Drizzle.**
  - For: most efficient, no connection management, no extra vendor, backups built in, staging database for free.
  - Against: biggest rewrite.
  - *Leaning: (a), because there's no data to migrate now.*
- **(b) D1 + Prisma adapter.** Less rewriting, but a larger bundle and a clumsier migration flow.
- **(c) Neon in Frankfurt + Hyperdrive + Prisma.** Smallest change and data in Germany, but a second vendor and bill, plus network hops to the database.

**Measured in the current code** (`src/`, excluding tests), to size the rewrite:

| Item | Count |
| --- | --- |
| Files importing the db client | 66 |
| `$transaction` call sites | 14 in 10 files |
| Interactive transactions (`$transaction(async …)`) | 5 |
| Raw SQL | 1 |
| Case-insensitive queries (`mode: "insensitive"`) | 2 |
| Prisma enums (`Role`, `Plan`, `DayPart`, `OverAllowance`, `BookingType`, …) | several |
| Migrations | 32 |

The migrations get replaced, not converted: start D1 from a fresh schema.

**RISK D1-1 — no interactive transactions in D1.** The 5 interactive transactions have to become `db.batch([...])` or single conditional statements. Look closely at the allowance check before booking in `src/lib/bookings.ts`. A read-then-write split into two requests can race and double-book an allowance. Possible fixes:

- a conditional `INSERT … SELECT … WHERE` inside one batch;
- a unique constraint;
- serialising per workspace through a Durable Object.

**RISK D1-2 — data types.**

- **Dates:** SQLite has no date type, so store timestamps as integers (ms) or ISO text consistently. Day-only leave dates should stay `YYYY-MM-DD` text to avoid timezone bugs.
- **Enums:** use text plus a check constraint, or Drizzle's `text({ enum })`.
- **Case-insensitive search:** use `COLLATE NOCASE` or `lower()`.

**RISK D1-3 — limits.**

- 10 GB per database and a single primary for writes, which should be placed in `weur`.
- Fine for years. If ever exceeded: shard per tenant/region.

**RISK D1-4 — Auth.js adapter.** Swap `@auth/prisma-adapter` for `@auth/drizzle-adapter`, keeping table/column names so existing sessions don't matter (there are no users anyway).

**RISK D1-5 — tests.** `*.db.test.ts` and `src/test/db.ts` assume Postgres. Run them against local D1 (Miniflare / `wrangler d1 execute --local`) or `better-sqlite3`, using the same migrations.

## Hosting risks

- **RISK H1 — Next.js version support.** The app is on Next 16.4.2. OpenNext usually trails new Next releases. Check the OpenNext compatibility table before anything else; if it's unsupported, wait or pin Next.
- **RISK H2 — bundle size.** The limit is 10 MB on paid. Next + Sentry + Stripe + MCP SDK (+ Prisma, if kept) could get close. Measure in the spike.
- **RISK H3 — Sentry on Workers.** `@sentry/nextjs` server-side has limited support on Workers. **DECISION H3:** use `@sentry/cloudflare` on the server, or accept client-only error reporting during beta.
- **RISK H4 — Vercel-specific code.** `process.env.VERCEL*` is used in `src/lib/db.ts`, `src/lib/url.ts`, `src/lib/domain.ts`, `src/sentry.options.ts`, `scripts/vercel-build.mjs` and `vercel.json`. Suggest replacing it with explicit `APP_ENV` (`production`/`staging`/`development`) and `APP_URL`.
- **RISK H5 — Node APIs.** Needs the `nodejs_compat` flag. There's no filesystem and no `child_process`. Check `qrcode`, `stripe` and the MCP SDK in the spike.
- **RISK H6 — image optimisation and ISR.** These need extra bindings (Cloudflare Images, an R2/KV incremental cache). Check which the app actually uses before adding them.

## Security notes

1. **Database access:** D1 is reachable only through the Worker binding, with no public connection string. That's an improvement.
2. **Cloudflare account:**
   - Turn on 2FA.
   - Give CI a scoped API token (this Worker + its D1/R2 only), never the global key.
   - Limit who has account access.
3. **Secrets:**
   - Store them with `wrangler secret put` for each environment.
   - Never put them in `vars` in `wrangler.jsonc` (that file is committed).
4. **Separate environments:** staging and production each get their own D1 database, R2 bucket, secrets, Stripe *test* keys and email sender.
5. **SQL injection:** use only parameterised queries (Drizzle's default). Review any `sql\`\`` raw usage.
6. **Crons:** prefer a `scheduled` handler (not reachable over HTTP). If `/api/cron/*` routes stay, keep the `CRON_SECRET` check.
7. **Off-site backup:** Time Travel lives in the same account. **Decided (S7):** keep backups in Cloudflare. A cron exports D1 daily or weekly, encrypts the dump with age (reuse the flow from `docs/backups.md`) and writes it to a separate EU R2 bucket with a bucket lock/retention rule *(verify)*, so a leaked app token can't delete it. The Worker gets write-only access to that bucket. Accepted risk: losing the account means losing the backups too.
8. **Inbound email (if used):** it's untrusted input. Cap the size, never render it as HTML, and validate the sender.
9. **Stripe webhooks:** confirm that signature verification works with the Workers request body (raw body handling).

## Environments and branches

Suggested setup:

| Branch | Worker | D1 | Notes |
| --- | --- | --- | --- |
| `main` | `vacation-planner` | `vacation-planner-prod` (EU) | Live keys, crons on |
| `develop` | `vacation-planner-staging` | `vacation-planner-staging` (EU) | Stripe test keys, Resend test sender or staging domain, crons off or on a test schedule |
| feature branches | — | local D1 | PR into `develop`, then `develop` → `main` to release |

Sketch only; the implementer decides the details:

```jsonc
{
  "name": "vacation-planner",
  "main": ".open-next/worker.js",
  "compatibility_date": "<current date>",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
  "d1_databases": [{ "binding": "DB", "database_name": "vacation-planner-prod", "database_id": "<id>", "migrations_dir": "drizzle" }],
  "triggers": { "crons": ["0 2 * * *", "0 3 * * *", "0 6 * * *"] },
  "env": {
    "staging": {
      "name": "vacation-planner-staging",
      "d1_databases": [{ "binding": "DB", "database_name": "vacation-planner-staging", "database_id": "<id>", "migrations_dir": "drizzle" }],
      "triggers": { "crons": [] }
    }
  }
}
```

**Deploys:** use GitHub Actions with `cloudflare/wrangler-action`.

- Push to `develop`: build, then `wrangler d1 migrations apply --env staging --remote`, then `wrangler deploy --env staging`.
- Push to `main`: the same, without `--env`.
- Keep the existing rules:
  - build before migrating;
  - migrations additive only (the old version keeps serving during the deploy).

Add `develop` to `ci.yml` and `migrations.yml`.

**RISK E1 — no automatic per-PR previews like Vercel.** `wrangler versions upload` gives preview URLs, but they share the staging bindings. That's acceptable for a single developer.

## Disaster recovery

The app is code in GitHub and can always be redeployed (to Cloudflare or elsewhere). What can't be recreated is the **data**: customers can only continue if a recent copy of the database is reachable.

| Scenario | App | Data | Customers continue? |
| --- | --- | --- | --- |
| Bad migration, bug or accidental delete of rows | Keeps running | D1 Time Travel restore to any minute in the last 30 days | Yes, within minutes; changes after the restore point are lost |
| D1 database deleted | Down until a new database is bound | Time Travel likely can't restore a deleted database *(verify)*; import the latest R2 export | Yes; changes since the last export are lost |
| Cloudflare outage | Down | Safe | Yes, once Cloudflare recovers |
| Cloudflare account lost, suspended or compromised | Redeployable from GitHub | Database **and** in-account backups gone | **No**, unless a copy exists outside Cloudflare |

**Before the first paying customer:**

- [ ] Add an off-Cloudflare copy: a GitHub Action (like `backup.yml`) pulls the D1 export daily, encrypts it with age, and uploads it to an EU bucket outside Cloudflare (e.g. Hetzner Object Storage, Germany, ~€1/month).
- [ ] Write and test a restore runbook: new account/database, import the dump, `wrangler deploy`, point DNS.
- [ ] Practise one restore and record the time it took.

## Suggested order of work

1. **Spike (½–1 day).** OpenNext build of the current app on Workers. Answers H1, H2, H5. Stop and reassess if it fails.
2. **Decide G1 and D1**, and record them in the decision log.
3. **Data layer:** Drizzle schema, rewrite of the queries and the 5 interactive transactions (RISK D1-1 first), Auth.js adapter, tests on local D1.
4. **Platform glue:** `APP_ENV`/`APP_URL`, `scheduled` handler for the crons, Sentry (H3), secrets.
5. **Environments:** create the `develop` branch, staging resources and deploy workflow.
6. **GDPR checklist and privacy policy update.**
7. **DNS:** move the domain to Cloudflare, add Resend's DNS records, cut over, delete the Vercel project and Neon (if no longer used).
8. **Backups:** off-site export (S7); update `docs/backups.md`.

## Rough cost (verify)

| Item | Vercel Pro today | Suggested Cloudflare stack |
| --- | --- | --- |
| Hosting | $20 per member per month + usage | $5/month + low overage |
| Database | Neon (free → paid for PITR) | Included in $5 |
| Storage / backups | External bucket | R2, free up to 10 GB |
| Email | Resend | Resend (same) |

## Decision log

| ID | Decision | Chosen | Why | Date |
| --- | --- | --- | --- | --- |
| G1 | How strict is "Germany" | (a) EU data residency, US processors under DPF + DPA | Common practice for EU SaaS; keeps the Cloudflare stack | 2026-10-23 |
| D1 | Database / ORM | D1 (EU jurisdiction, `weur`) + Drizzle | No data to migrate during beta; most efficient long term | 2026-10-23 |
| H3 | Sentry on Workers | `@sentry/cloudflare` on the server, `@sentry/nextjs` on the client, Sentry EU (Frankfurt) region | Official Sentry SDK for Workers; keep `sentry-scrub` | 2026-10-23 |
| S7 | Off-site backup | Stay inside Cloudflare: D1 Time Travel (30 days) + scheduled encrypted `d1 export` to a separate EU R2 bucket with a retention lock | Simple, no extra vendor. Accepted risk: losing or compromising the Cloudflare account loses backups too; off-Cloudflare copy required before first paying customer (see Disaster recovery) | 2026-10-23 |
