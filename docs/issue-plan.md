# Plan for the open issues

Written 2026-10-22 from the 23 open issues and 5 open Dependabot PRs on main at `a921ba2`. #68, #69 and #70 are already closed. Nothing here is started; Ajdin approves one wave at a time.

Sizes: **S** is up to half a day, **M** about a day, **L** two to three days, **XL** more. Every PR says `Closes #N`, merges `origin/main` first and runs the full CI sequence (lint, typecheck, test, migrate a fresh DB, test:db, build) before it is reported.

## The order in one line

Stability and data safety first, then a test safety net, then the features that win practices, care and trades, then integrations, and the code-structure refactor last.

## Wave 0: housekeeping (today, about an hour)

| Item | Size | Notes |
|---|---|---|
| Dependabot #86 (setup-node 7), #88 (minor and patch group) | S | Merge when CI is green. |
| Dependabot #89 (@types/node 26), #90 (eslint 10), #91 (TypeScript 7) | S each | Major versions. Check each on its own branch; TypeScript 7 and eslint 10 may need config changes or should wait until Next.js supports them. Close with a note if they break the build. |
| Owner steps that take days to come back | - | Start now so later waves aren't blocked: Neon plan for #27, Azure and Google app registrations for #32. See "What Ajdin has to decide or do". |

## Wave 1: security and stability (5 threads in parallel, about 1 week)

These fix things that lose data, money or sign-ins. They touch different files, so they can run as parallel threads, except where a thread lists two issues in order.

| Thread | Issues, in order | Size | Main files | Why first |
|---|---|---|---|---|
| A. Backups and deploys | #27 backups and tested restore, then #30 safe migrations | M + S | new `.github/workflows/backup.yml`, `ci.yml`, README | The only P1 left. A bad migration or a lost Neon account is unrecoverable today. |
| B. Crons and restore | #74 cron time budget, then #71 restore of a paid workspace | M + S | `api/cron/*`, `vercel.json`, `src/lib/retention.ts`, `settings/actions.ts`, `restore-actions.ts`, `src/lib/stripe.ts` | The purge promised in the privacy policy and the trial emails may silently never run. #71's recommended fix (cancel the subscription when the 30-day window ends) lives in the same purge code, so it follows #74 in the same thread. |
| C. Sign-in throttle | #72 | M | `src/lib/sign-in-limit.ts`, `src/auth.ts`, sign-in page, a small migration | Anyone can lock a colleague out today. Must land before #32, which edits the same files. |
| D. Consent for "no email" people | #73 | M | `src/lib/no-email-members.ts`, `members/actions.ts`, invitations | Breaks the "nobody joins without an invite" rule. |
| E. Bookings speed and correctness | #75 side effects after the response, then #76 allowance queries, then #78 one day count | M + M + M | `src/lib/bookings.ts`, `src/lib/email.ts`, `book/load.ts`, `src/lib/db.ts`, list pages | All three change `bookings.ts`, so they go one after another in one thread. #76 is what keeps a 75-person Business workspace from running out of database connections. |

Conflict notes: threads C and D both add small migrations; whoever merges second regenerates the migration timestamp after merging main. Thread A edits `ci.yml`, so wave 2 waits for it.

## Wave 2: the safety net (1 thread, after wave 1, 2 to 3 days)

| Issue | Size | Depends on | Notes |
|---|---|---|---|
| #79 authorization matrix test and a Playwright plus axe smoke test in CI | L | #30 (both edit `ci.yml`), wave 1 merged (#72 and #73 change server actions the matrix lists) | Must exist before #77 adds roles and before #36 moves code around. The matrix fails when a new server action isn't listed, so later threads can't forget a permission check. |

## Wave 3: what wins customers (3 threads, about 2 weeks)

| Thread | Issues, in order | Size | Depends on | Notes |
|---|---|---|---|---|
| F. Approvals | #77 Approver and read-only roles, then #80 reminders and a stand-in approver | L + M | #79 (matrix), #74 (digest cron), #75 (notifications after the response) | #80's stand-in approver needs the Approver role. Head nurse, shift lead and foreman can approve without owning billing. |
| G. One-click approve | #33 | M | #75; touches the same request email as #80, so it merges before #80 starts or rebases on it | Parallel with #77 is fine if #33 checks permission through `can()` and #77 merges second. |
| H. Microsoft and Google sign-in | #32 | M | #72 (same auth files), Ajdin's app registrations | Biggest trust signal for offices on Microsoft 365, and it ends the link-scanner problem for them. |
| I. Leave types and stand-in | #34, then #82 allowance policy | L to XL, then M | Thread E finished (#78 changes how days are counted), Ajdin's input | Changes the booking type everywhere, so it runs alone in the bookings code. #82 reuses the per-type "counts against allowance" flag, so it follows. |

Thread I overlaps thread F on the approvals card and request email; start I after F's #77 merges, or run them one after another.

## Wave 4: integrations and hardening (as capacity allows)

| Issue | Size | Depends on | Notes |
|---|---|---|---|
| #56 import from a Google Sheets link | S | nothing | Only touches the import page. Can fill a gap in any wave. |
| #81 hardening backlog | 6 × S | nothing | Split into small PRs. Calendar feed token hashing (item 2) and the separate 2FA key (item 3) are worth pulling into wave 1 if a thread has room. CodeQL, secret scanning and `TOTP_ENCRYPTION_KEY` need Ajdin. |
| #35 two-way calendar (Outlook and Google out-of-office) | L | #32 | Google calls calendar write a sensitive scope; its app verification can take weeks, so start that early or launch Microsoft first. |
| #57 sync people from Microsoft 365 or Google Workspace | L | #32 | Needs admin consent for directory read. |
| #45 MCP server with personal tokens | L | #33, #77, #81 item 2 (same hashed-token pattern) | Bonus for office teams; sell it as "works with Claude, ChatGPT and Copilot". |
| #58 Personio and absence.io API import | M | nothing | File exports already cover these customers. Recommend parking until a customer asks. |

## Wave 5: code structure (last, 1 thread, sequential)

| Issue | Size | Depends on | Notes |
|---|---|---|---|
| #36 split `src/lib` by feature, thin route files (craft architect) | XL, one feature per PR | #25 tests (done), #79, and no other thread working in bookings | `src/lib` now has 87 files and `bookings.ts` 685 lines. Moving files conflicts with everything, so pause other bookings work while it runs, one feature per PR. |

## What can run in parallel

- **Parallel now (wave 1):** A, B, C, D and E. They touch different files.
- **Must be sequential:** #74 → #71; #75 → #76 → #78; #30 → #79; #72 → #32; #79 → #77 → #80; #78 → #34 → #82; #32 → #35 and #57; #33 and #77 → #45; everything → #36.
- **Parallel in wave 3:** F, G and H. I waits for F's #77.

## What Ajdin has to decide or do

| Issue | What | When |
|---|---|---|
| #27 | Put Neon on a plan with 7 or more days of history. Pick an EU storage bucket for the nightly encrypted dump and add its keys as GitHub secrets. Keep the private `age` key offline. Try the restore once with Claude. | Before thread A can finish |
| #30 | Nothing required. Optional: a Neon branch as staging for previews. | Wave 1 |
| #74 | An account at a heartbeat monitor (Healthchecks.io or Better Stack) and its ping URL in Vercel. | Wave 1 |
| #71 | Confirm the fix: cancel the subscription when the 30-day restore window ends (recommended), or warn on restore. | Wave 1 |
| #32 | App registrations in Azure (multi-tenant) and Google Cloud, client ids and secrets in Vercel. | Start in wave 0 |
| #77 | Do approvers need groups (approver per department), or is one Approver role enough for now? | Before wave 3 |
| #80 | OK with a reminder after 3 days and "auto-approve if nobody answers" off by default? | Before wave 3 |
| #34 | Which built-in types (overtime, training, parental leave, …), whether a type can have its own yearly allowance, and whether the stand-in is optional. Sick and special leave are already done (#59, #61). | Before thread I |
| #82 | Default for "booking more than the days left" (recommend: keep today's warning) and how many days after a booking ends members can still change it. | Before thread I |
| #81 | Turn on CodeQL and secret scanning in GitHub settings; add `TOTP_ENCRYPTION_KEY` in Vercel. | Wave 4 |
| #35 | Google app verification for calendar write access. | Before #35 |
| #58 | Park until a customer asks? | Any time |
| Dependabot | Merge the safe ones; decide whether TypeScript 7 and eslint 10 wait. | Wave 0 |
