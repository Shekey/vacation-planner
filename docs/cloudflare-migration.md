# Moving from Vercel to Cloudflare

Status: proposal. Tracks the GitHub issue "Migrate hosting from Vercel to Cloudflare".

## TL;DR

Moving the **hosting** to Cloudflare Workers (via OpenNext) is reasonable. Moving the **database** to D1 + Drizzle is not worth it right now.

| Piece | Suggested stack | Recommendation |
| --- | --- | --- |
| Next.js hosting | OpenNext for Cloudflare Workers (`@opennextjs/cloudflare`) | **Do it** |
| Database | Keep Postgres (Neon) + Prisma, connect through **Cloudflare Hyperdrive** | **Keep**, don't move to D1 |
| File uploads | R2 | **Not needed yet**: the app stores no uploaded files (CSV import is parsed in memory). Use R2 later, and optionally now as the backup bucket |
| Outbound email | Resend | **Keep as is**: `src/lib/email.ts` uses plain `fetch`, which works on Workers unchanged |
| Inbound email | Cloudflare Email Routing | Fine, free, only if we actually need to receive mail (e.g. `support@`) |
| Crons | Workers Cron Triggers | Replace `vercel.json` crons |
| Branches | `develop` → staging Worker, `main` → production Worker | **Do it** |

## Why not D1 + Drizzle

The app is built on Postgres + Prisma: a 528-line `prisma/schema.prisma`, 32 migrations, Postgres enums, `@auth/prisma-adapter`, and DB tests in `*.db.test.ts`. Moving to D1 means:

- Rewriting every query from Prisma to Drizzle and swapping the Auth.js adapter.
- Converting Postgres to SQLite: no native enums, different date/JSON handling, no `ILIKE`, weaker transactions (D1 has no interactive transactions, only `batch()`).
- Migrating production data and rewriting the backup workflow (`docs/backups.md`).
- Hard limits: **10 GB per D1 database** (paid), 500 MB on free; one D1 database is single-region with read replicas only.

That's weeks of risk for no user-visible gain. Prisma 7 with `@prisma/adapter-pg` already runs on Workers when it talks to Postgres through Hyperdrive. Revisit D1 only if Neon cost becomes a problem.

## Things on Cloudflare that are *not* generous (read before deciding)

**Workers free plan is not enough for this app; budget the $5/month Workers Paid plan.**

- **CPU time**: free = **10 ms CPU per request**. Next.js server rendering + Prisma + Auth.js routinely exceeds that. Paid = 30 s default (configurable up to 5 min).
- **Bundle size**: free = **3 MB** compressed Worker, paid = **10 MB**. Next.js + Prisma client + Sentry + Stripe + MCP SDK is close to the free limit; check `opennextjs-cloudflare build` output.
- **Requests**: free 100k/day; paid 10M/month included, then $0.30/million.
- **Cron Triggers**: free 5 per account; we use 3, fine. They count against CPU limits, so the daily digest must finish within the paid CPU limit.
- **Subrequests**: 50 per request on free, 1000 on paid. A cron that emails many people one by one can hit 50.
- **Hyperdrive**: included on free and paid but free has a daily query cap (100k/day); paid is unlimited.
- **Next.js support lag**: OpenNext supports Next 15/16 but usually trails new Next releases by weeks. We're on Next 16.4.2; check the OpenNext compatibility table first. Some features (e.g. `next/image` optimisation, ISR revalidation) need extra bindings (Images, KV/R2 for the incremental cache, Durable Objects for tag revalidation).
- **Node APIs**: needs `nodejs_compat`. `child_process`, real filesystem and long-lived TCP pools don't exist; `pg` works only through Hyperdrive/sockets.
- **Sentry**: `@sentry/nextjs` isn't fully supported on Workers. Plan to use `@sentry/cloudflare` on the server side or accept reduced server error reporting.
- **Preview deployments**: no automatic per-PR preview URLs like Vercel with a database per branch. Workers "preview URLs"/versions exist but share bindings unless you configure a separate env. That's why the `develop` → staging setup below matters.
- **Email Routing**: receive only. It forwards to verified addresses or to an Email Worker; it **cannot send** (keep Resend for that). Only works when the domain's DNS is on Cloudflare.

**Resend (unchanged) limits worth knowing**: free = 3,000 emails/month **and 100/day**, 1 domain. The daily digest cron plus magic links could hit 100/day once there are a few teams; Pro is $20/month for 50k.

**R2 is generous**: 10 GB storage free, no egress fees. Good choice for backups even today.

**Neon (unchanged)**: free plan only keeps hours of history and 0.5 GB; see `docs/backups.md`.

## Rough cost

| Item | Vercel today | Cloudflare |
| --- | --- | --- |
| Hosting | Hobby free (not allowed for commercial use) / Pro $20 per seat | Workers Paid $5/month |
| DB | Neon | Neon (same) |
| Email | Resend | Resend (same) |

## Branch / environment setup

- `main` → production Worker (`vacation-planner`), production Neon branch.
- `develop` → staging Worker (`vacation-planner-staging`), separate Neon branch (Neon branching is free), separate Hyperdrive config, Resend test sender or a staging domain, Stripe test keys.
- Feature branches → PRs into `develop`; `develop` → PR into `main` to release.

`wrangler.jsonc` with two environments:

```jsonc
{
  "name": "vacation-planner",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-10-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
  "hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<prod-hyperdrive-id>" }],
  "triggers": { "crons": ["0 2 * * *", "0 3 * * *", "0 6 * * *"] },
  "env": {
    "staging": {
      "name": "vacation-planner-staging",
      "hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<staging-hyperdrive-id>" }],
      "triggers": { "crons": [] }
    }
  }
}
```

Deploy from GitHub Actions (`cloudflare/wrangler-action`): on push to `develop` run `wrangler deploy --env staging`, on push to `main` run `wrangler deploy`. Run `prisma migrate deploy` against the matching database **after** the build succeeds, before deploy, same rule as `scripts/vercel-build.mjs` (build first, additive migrations only). Add `develop` to `ci.yml`'s branch list.

## Migration steps

1. **Spike** (half a day): `npm i -D @opennextjs/cloudflare wrangler`, add `open-next.config.ts` and `wrangler.jsonc`, run `opennextjs-cloudflare build && opennextjs-cloudflare preview`. Check bundle size, that sign-in, Stripe webhooks and the MCP route work. Stop here if Next 16.4 isn't supported yet.
2. **Database connection**: create a Hyperdrive config per environment pointing at Neon's direct (non-pooled) URL. In `src/lib/db.ts`, read the connection string from the Hyperdrive binding (`getCloudflareContext().env.HYPERDRIVE.connectionString`) and create the client per request instead of a global singleton (Workers can't reuse sockets across requests).
3. **Remove Vercel specifics**: `process.env.VERCEL*` in `src/lib/db.ts`, `src/lib/url.ts`, `src/lib/domain.ts`, `src/sentry.options.ts`, `scripts/vercel-build.mjs`, `vercel.json`. Replace with an explicit `APP_ENV` (`production`/`staging`) and `APP_URL`.
4. **Crons**: add a `scheduled` handler in a custom worker entry that calls the existing `/api/cron/*` logic (or `fetch`es the routes with `CRON_SECRET`). Map each cron expression to its route.
5. **Secrets**: `wrangler secret put` for `AUTH_SECRET`, `AUTH_RESEND_KEY`, `EMAIL_FROM`, Stripe keys, Sentry DSN, etc., per environment.
6. **Sentry**: switch server instrumentation to `@sentry/cloudflare`, keep client-side `@sentry/nextjs`.
7. **CI/CD**: create the `develop` branch, add the deploy workflow, add `develop` to `ci.yml` and `migrations.yml`.
8. **DNS**: move the domain to Cloudflare DNS (needed for Email Routing anyway), set up Resend's DNS records there, then point the domain at the production Worker. Keep Vercel running until production is verified, then delete the Vercel project.
9. **Optional**: move the backup bucket (`docs/backups.md`) to R2; enable Email Routing for `support@`.

## Rollback

Until step 8 is done, Vercel keeps serving production, and the database is unchanged, so rollback is just pointing DNS back to Vercel.
