# Urlaubflow: rebrand, redesign and SEO plan

Written 2026-10-22. The app "Vacation Planner" becomes **Urlaubflow**, served at **https://urlaubflow.de**, with the new Figma design and SEO built in from the start. Nothing here is built yet; Ajdin approves the plan first.

Design: [Figma "Vacation-APP"](https://www.figma.com/design/3ROXulER2DLklVz34DfOMF/Vacation-APP). The design still says "Vacation Planner" and uses a sample "Dental Practical" team; we use **Urlaubflow** everywhere.

## The order in one line

Rename and domain first (small, touches text only), then tokens and the app shell (the whole app changes look in two PRs), then public pages with SEO, then the remaining app pages one per PR, then content pages that bring in search traffic.

## What the design contains

24 frames on one page, desktop (1440) and mobile (390) for each:

| Area | Frames (node id) | Maps to today |
|---|---|---|
| Sign-in | Sign in `6:10430`, Check your email `6:10485`, Welcome back `6:10524` | `/sign-in`, `/sign-in/confirm`, the "check your email" page |
| Home | Mobile `6:10558`, Desktop `6:11006` | `/w/[slug]` overview |
| Team calendar | Mobile `6:10652`, Desktop `6:11195` | `/w/[slug]/calendar` |
| Request time off | Mobile `6:10777`, Request sent `6:10942` | `/w/[slug]/book` |
| Admin | Admin overview `18:23414`/`18:23605`, Approvals `18:23764`/`18:23961`, Members `18:24104`/`18:24375`, Activity `18:24576`/`18:24706`, Settings `18:24806`/`18:25015`, Billing `18:25198`/`18:25384` | the pages under "Admin" today |
| Landing | Desktop `39:3`, Mobile `39:535` | `src/app/landing.tsx` |
| Guidance | "Responsive & UX guidance" `6:11536` | rules below |

No design yet for: My time off (`/me`), People, Holidays, Import, Account, `/admin` (operator), legal pages, error pages. Those get the new tokens and shell only; no new layouts are invented.

### Design tokens (read from the Figma code)

| Token | Value | Use | Today |
|---|---|---|---|
| `background` | `#f7f7f2` | page | `#f5f7fa` |
| `surface` | `#ffffff` | cards, sidebar | same |
| `surface-muted` | `#f0f2ee` | workspace switcher, day tiles | new |
| `border` | `#dfe6e3` | card borders, dividers | `rgb(20 24 33 / .1)` |
| `foreground` | `#20363e` | text | `#141821` |
| `muted` | `#64757a` → **`#5c6d72`** | secondary text | `#5d6676` |
| `primary` | `#0878a4` | buttons, links, active nav | `#0369a1` |
| `primary-ink` | `#086180` | text on `primary-soft` | new |
| `primary-soft` | `#e8f4f8` | balance card, active nav, avatars, tips | new |
| `accent` | `#48bed4` | "booked" part of the allowance bar | new |
| `success` / `success-soft` | `#2b7164` / `#eaf3ef` | Approved badge | new |
| `warning` / `warning-soft` | amber, dashed border | Pending badge and pending bars | new |

Type: **Inter** only (regular and semibold; 11/12/13/14/15/17/26/32/48 px; line height 1.45). Self-hosted with `next/font`. Bricolage Grotesque and Caveat go away. Radii: 18 px cards, 12 px buttons, 10 px tiles and nav items, 6 px badges. Icons are Lucide (calendar-check-2, house, calendar-days, sun, users, settings-2, bell, …): add `lucide-react` and import icons one by one (tree-shaken).

Contrast checked against WCAG AA: white on `#0878a4` is 4.96:1 and passes. Three pairs fail by a hair: `#64757a` on the page background (4.47), on `#f0f2ee` (4.27), and `#0878a4` text on `#e8f4f8` (4.42, the active nav item). Fix: muted becomes `#5c6d72` and active nav text uses `primary-ink`. Visually the same.

Dark mode is not in the design. We keep it (the app has it today) and derive dark tokens from the same hues.

### Rules from the guidance frame

- Navigation: bottom bar below 768 px (Home · Calendar · Request · Me), compact rail 768–1199 px, persistent sidebar from 1200 px. Admin pages live under "Workspace tools", never as wrapping tabs. Workspace switcher in the sidebar; language, account and sign-out in the profile menu.
- Calendar: on phones a week strip, then the chosen day (who is away, staffing). On desktop people × dates, two weeks by default, sticky names and headers, a selected day shows who is in and away. Pending is dashed, status is icon + label, never colour alone. Weekends, non-working days and regional holidays look different.
- Request: choose dates → see impact → send. Show workdays deducted, holidays skipped and projected balance before sending. Warn about minimum staffing, don't block; block only invalid ranges, overlaps and hard policy.
- Sign-in: Google, Microsoft or magic link (Google/Microsoft come with #32). Change and Resend on "check your email", rate limit explained. One workspace: go straight in.
- Accessibility: WCAG 2.2 AA, 44 × 44 targets, calendar usable by keyboard (roving focus, arrow keys) with an agenda alternative, live region for submit and resend, reduced motion respected.
- Build every edge state: loading and retry, nothing found, part-time and holiday days, half day AM/PM, not enough days, overlap, coverage changed while sending, pending / approved / declined (with reason) / cancelled.

## Phase 1: name and domain (2 PRs, start now)

Both are small and touch mostly text, so they merge cleanly next to wave 1.

### R1. Rename to Urlaubflow

- One constant `BRAND = { name: "Urlaubflow", domain: "urlaubflow.de" }` in `src/lib/brand.ts`; `common.appName` and everything else read it.
- Text: i18n messages (`common`, `signIn`, `email`, `settings`, `landing`, `workspace`, `importer`), legal pages (AGB, Datenschutz, AVV, Impressum), manifest (name, short name, theme colour), TOTP issuer, data export file name (`urlaubflow-meine-daten.json` / `urlaubflow-my-data.json`), `.env.example`, README.
- Kept on purpose: the iCal `UID` suffix `@vacation-planner` (changing it makes subscribed calendars show every absence twice), the repo and npm package name, database names.
- German copy: "Urlaubflow" is a name, so no article ("in Urlaubflow", not "im Urlaubflow"). Legal texts change the product name only; the binding German version is reviewed in the diff.
- Emails: sender display name "Urlaubflow". Existing 2FA entries in authenticator apps keep the old label until re-enrolled; that's fine.

### R2. Domain urlaubflow.de and redirects

- `src/lib/url.ts`: a canonical `SITE_URL` (`https://urlaubflow.de` in production via `NEXT_PUBLIC_SITE_URL`); emails, metadata, sitemap and OG use it. Previews keep their own host.
- Redirects in `next.config.ts` (`redirects()` with a `host` condition, 308): `vacation-planner-lyart.vercel.app/*` → `https://urlaubflow.de/*`, path and query kept, and `www.urlaubflow.de` → apex.
- Not redirected on the old host, so nothing breaks for people already using it: `/api/calendar/*` (Outlook and Google calendar subscriptions don't always follow redirects; they keep working for 12 months, and Settings shows the new feed URL), `/api/stripe/webhook` and `/api/cron/*` until the new endpoints are live.
- Sign-in links already emailed with the old host still work: the redirect keeps the path and token, and the database is the same. People sign in once more on the new domain because cookies are per domain.
- Test: unit test for the redirect rules, and a check that no absolute URL in emails points at `vercel.app`.

## Phase 2: look and shell (2 PRs)

### D1. Tokens, Inter, base components

- Replace the tokens in `src/app/globals.css` with the table above (light and dark), switch the font to Inter.
- Update `.btn`, `.btn-secondary`, `.card`, `.input`, `.eyebrow` to the new radii and colours. Because every page uses these classes, the whole app takes the new look in one PR without touching page files.
- New shared components in `src/components/ui.tsx`: `StatusBadge` (approved, pending, declined, cancelled, with icon), `StatTile`, `SectionHeading` (title + "→" link), `InfoNote`, `Avatar` restyled (rounded square, initials in `primary-ink`), `LogoMark` = the calendar-check mark on `primary`.
- New favicon, apple icon, manifest colours from the mark.
- Screenshots of every page EN/DE, light/dark, desktop/phone attached to the PR; axe check passes.

### D2. App shell

- `src/app/w/[slug]/layout.tsx`: sidebar with logo, workspace switcher, everyday nav (Home, Team calendar, My time off, People), "Workspace tools" (admin only), profile menu at the bottom. Top bar with breadcrumb, time zone, notifications bell (links to approvals/requests for now), avatar.
- Rail at 768–1199 px, bottom bar below 768 px (`src/components/bottom-nav.tsx`: Home, Calendar, Request, Me). People moves into Me/Home on phones as in the design.
- The root `layout.tsx` header is used only by public and account pages after this.

## Phase 3: public site with SEO (3 PRs, after R1 and R2)

### S1. SEO foundation

Today the language is chosen by cookie on the same URL and the root layout calls `auth()`, so every public page is rendered per request and Google sees one language. That costs both ranking and speed. The fix:

- **URLs per language.** German at the root (`/`, `/preise`, `/impressum`, …), English under `/en` (`/en`, `/en/pricing`, `/en/legal-notice`, …). The app (`/w/...`, `/account`, `/sign-in`) keeps today's cookie and browser detection. A first visit to `/` with an English browser shows a small "View in English" hint instead of redirecting (redirecting by browser language confuses Googlebot). The EN/DE switch on public pages links to the other URL and saves the cookie. Old `?lang=en` links redirect to the `/en` path.
- **Static public pages.** A `(site)` route group with its own layout that doesn't call `auth()` or read cookies, so landing, pricing, legal and content pages are prerendered and served from the CDN. Signed-in visitors on `/` are sent to their workspace by a session-cookie check in `proxy.ts` (Next 16's middleware); the page itself stays static.
- **Metadata per page and language** via `generateMetadata`: title (≤ 60 chars, keyword first), description (≤ 155), `alternates.canonical`, `alternates.languages` (`de`, `en`, `x-default` → German), Open Graph and Twitter card with `locale` `de_DE` / `en_US`, `metadataBase` = `SITE_URL`.
- **OG images** generated per page and language with `next/og` (`opengraph-image.tsx`), in the brand colours, no external fonts at runtime.
- **`sitemap.ts`** listing every public URL with its language alternates and `lastModified`; **`robots.ts`** allowing the public site and disallowing `/w/`, `/api/`, `/admin`, `/account`, `/invite`, `/two-factor`, `/sign-in`, with the sitemap URL. App pages also get `robots: noindex` in their layout.
- **Structured data** (JSON-LD, one helper `src/lib/seo/jsonld.ts`): `Organization` (name, url, logo, contact, `sameAs` when there are profiles), `WebSite`, `SoftwareApplication` (`BusinessApplication`, web, offers that match the visible prices, `inLanguage`), `FAQPage` on landing and pricing (Google shows FAQ results rarely now, but Bing and AI answers read it), `BreadcrumbList` on content pages, `Article` on guides. Validated in a unit test against the schema shape.
- **Other:** `<html lang>` from the path, one `h1` per page, semantic headings, descriptive link text, `alt` on every image, `/.well-known/security.txt`, `llms.txt` with a plain summary of the product and prices for AI assistants.

### S2. Landing page in the new design

- Rebuild `/` and `/en` from Figma `39:3` / `39:535`: hero "Everyone's time off in one place. No Excel, no WhatsApp." with the calendar mock, "Made for teams that can't all be off at once" (six team types), "Who covers reception?", "Days left. Not a guessing game.", "The right days off, wherever people work" (holidays per Bundesland), Teams/Slack, "Up and running in five minutes", beta pricing, FAQ, final CTA, footer.
- German copy written for search, not translated from English: H1 and title target **Urlaubsplaner für Teams**; sections use Urlaubskalender, Urlaubsverwaltung, Urlaubsantrag, Resturlaub, Feiertage nach Bundesland naturally.
- The product mock is HTML/CSS (no screenshots), so it's sharp, translatable and light. Existing landing pieces (team switcher, price picker, reveal) are reused where the design has them and removed where it doesn't.

### S3. Core Web Vitals budget

- Targets on a mid-range phone over 4G: LCP < 2.0 s, CLS < 0.05, INP < 200 ms; public pages ship < 90 kB of JavaScript.
- How: static pages from S1, Inter as one variable font subset with `display: swap` and fallback metrics (no layout shift), no client components above the fold except the tiny language switch, scroll effects in CSS, images through `next/image` with AVIF, PostHog loaded after idle.
- Lighthouse CI in GitHub Actions on `/` and `/en` (and the top content page) with these budgets; the PR fails when a page gets slower.

## Phase 4: app pages in the new design (one PR per row)

Each PR is presentational: same server actions and data, new markup, EN/DE strings in the i18n files, screenshots and an axe run attached.

| PR | Pages | Figma | Notes |
|---|---|---|---|
| P1 | Sign in, check your email, welcome back, invite accept | `6:10430`, `6:10485`, `6:10524` | Room for Google/Microsoft buttons; they appear when #32 lands. |
| P2 | Home (workspace overview) | `6:11006`, `6:10558` | Balance card with three-part bar, "at the practice today" with this week's staffing, next time off, coming up in the team. Getting-started checklist stays for new workspaces. |
| P3 | Team calendar | `6:11195`, `6:10652` | People × dates, two weeks default, filters (people, status, period), day detail panel, phone week strip + day list, keyboard grid. Biggest PR of the phase. |
| P4 | Request time off, request sent | `6:10777`, `6:10942` | Impact preview (workdays, holidays, balance after approval, staffing warning). Full screen on phones, side panel on desktop. |
| P5 | My time off, People | none | New tokens and components; layout follows Home's cards. |
| P6 | Admin overview, Approvals | `18:23414`, `18:23764` (+ mobile) | Admin overview is new: pending requests, staffing risks, setup gaps. |
| P7 | Members, Activity | `18:24104`, `18:24576` (+ mobile) | |
| P8 | Settings, Billing | `18:24806`, `18:25198` (+ mobile) | Settings split into sections with a side index on desktop. |
| P9 | Remaining: Holidays, Import, Account, error and not-found pages, emails | none | Emails get a simple branded HTML layout next to the plain text. |

## Phase 5: content that wins search (parallel, German first)

Competitors that rank today for these terms are mostly HR suites (Personio, absence.io, Factorial, Timetastic, Urlaubsverwaltung.cloud) and template sites. They are weak on small teams, Feiertage per Bundesland and practical tools. Every page below links into sign-up and into each other; each is its own PR, so they run in parallel without touching app code.

| PR | Pages | Main keywords |
|---|---|---|
| C1 | `/urlaubsplaner`, `/urlaubskalender-team`, `/urlaubsverwaltung`, `/urlaubsantrag` (+ `/en/leave-planner`, `/en/team-vacation-calendar`) | Urlaubsplaner, Urlaubsplaner Team, Urlaubskalender Team, Urlaubsverwaltung Software, digitaler Urlaubsantrag |
| C2 | Branchen: `/branchen/arztpraxis`, `/pflegedienst`, `/kita`, `/handwerk`, `/gastronomie`, `/buero` | Urlaubsplanung Arztpraxis, Dienstplan Urlaub Pflege, Urlaubsplanung Kita, … |
| C3 | Feiertage: `/feiertage/2026`, `/feiertage/2027`, `/feiertage/2027/berlin` … (16 Bundesländer × current and next year), from our holiday data | Feiertage 2027 Berlin, Feiertage NRW 2027 (very high volume, every year) |
| C4 | Brückentage: `/brueckentage/2027` and per Bundesland, reusing `src/lib/smart-days.ts` | Brückentage 2027, Brückentage NRW |
| C5 | Rechner: `/urlaubsanspruch-rechner` (Teilzeit, Eintritt unterm Jahr, BUrlG minimum, reusing `proratedAllowance`), `/resturlaub` (rules + calculator, 31. März) | Urlaubsanspruch berechnen, Urlaubsanspruch Teilzeit, Resturlaub verfällt |
| C6 | `/urlaubsplaner-vorlage`: free Excel template 2027 for download (our own importer reads it back in one click) | Urlaubsplaner Excel Vorlage 2027, Urlaubsplaner 2027 Vorlage |
| C7 | Vergleiche: `/vergleich/excel`, `/alternative/personio`, `/alternative/absence-io`, `/alternative/timetastic` (factual tables, dated, no claims we can't back) | Personio Alternative, absence.io Alternative, Urlaubsplanung ohne Excel |
| C8 | Ratgeber (guides): Urlaubssperre, krank im Urlaub (§ 9 BUrlG), Urlaub verfällt, Urlaubsplanung im Team fair verteilen, Urlaub in der Probezeit | long-tail questions; `Article` + FAQ data |

Rules for content: written for the reader first, with real numbers and examples; legal topics cite the law and carry a "no legal advice" note; each page has a unique title, description, OG image, breadcrumbs and internal links; holiday and Brückentage pages regenerate each year and are in the sitemap with their date.

After launch: Search Console and Bing data decide which pages get expanded. A monthly check in the issue plan.

## Sequencing with the running work

- Wave 1 is mostly merged; #98 (crons) is open. R1 changes text lines in i18n and legal files and R2 adds redirects to `next.config.ts`; both rebase trivially. Start them now.
- D1 changes `globals.css` and `ui.tsx` only. D2 changes the workspace layout and bottom nav. Neither touches business logic, so wave 2 (#79 tests) and wave 3 feature threads rebase on them easily. #79's browser test should select by role and label, not by class, so the redesign doesn't break it.
- Phase 4 page PRs and wave 3 features touch the same pages. Rule: a page's redesign PR merges before a feature thread starts on that page (P2–P4 before #77/#80/#33 change approvals and requests; P1 before #32 adds provider buttons). P6 after #77 if that is already running.
- Phase 5 is independent and can run any time after S1.
- #36 (code structure) stays last.

Suggested threads: **Rebrand A** R1 → R2 → S1 → S2 → S3. **Rebrand B** D1 → D2 → P1 → P2 → P3 → P4 … (starts with D1 in parallel to R1). **Content** C1 … C8 after S1, one or two at a time so Ajdin can review the copy.

## What Ajdin has to do

Start the first block now; DNS and email verification can take a day.

| When | Step |
|---|---|
| Now | **Vercel** → Project → Settings → Domains: add `urlaubflow.de` and `www.urlaubflow.de`, set `www` to redirect to `urlaubflow.de`, keep `vacation-planner-lyart.vercel.app` on the project (our redirects handle it). Put the DNS records Vercel shows at the domain registrar (usually an A record for `@` and a CNAME for `www`). |
| Now | **Vercel env**: `NEXT_PUBLIC_SITE_URL=https://urlaubflow.de` (Production). Still leave `AUTH_URL` unset. |
| Now | **Resend**: add domain `urlaubflow.de` (or `mail.urlaubflow.de`), add its SPF and DKIM records, add a DMARC record (`v=DMARC1; p=none; rua=mailto:dmarc@urlaubflow.de` to start). When verified, set `EMAIL_FROM="Urlaubflow <hallo@urlaubflow.de>"`. |
| Now | **Mailboxes** for `hallo@` and `datenschutz@urlaubflow.de` (any provider), then update the `LEGAL_*` contact env vars so the Impressum shows them. |
| Now | **Trademark check**: search "Urlaubflow" at DPMA and EUIPO before spending on marketing. Optionally register the word mark. |
| After R2 is live | **Stripe**: add webhook endpoint `https://urlaubflow.de/api/stripe/webhook`, put its new signing secret in `STRIPE_WEBHOOK_SECRET`, set business name and statement descriptor to URLAUBFLOW and the brand colour in Checkout/Portal settings; delete the old endpoint a week later. |
| After R2 is live | **Sentry** allowed domains and **PostHog** authorized URLs: add `urlaubflow.de`. Uptime monitor: switch to `https://urlaubflow.de/api/health`. |
| After R2 is live | **Google Search Console**: add a Domain property for `urlaubflow.de` (DNS TXT record), submit `https://urlaubflow.de/sitemap.xml`. **Bing Webmaster Tools**: import from Search Console. |
| Before #32 | Azure and Google app registrations use `https://urlaubflow.de` redirect URIs (do the domain first). |
| Any time | Social profiles (LinkedIn page at least) for `sameAs` and trust; a Google Business Profile isn't needed for SaaS. |

## Decisions (defaults used unless Ajdin says otherwise)

1. **German at `/`, English at `/en`** for public pages (recommended; needed for hreflang and German ranking). Asked in the thread.
2. Spelling is "Urlaubflow" (one word, capital U only).
3. Dark mode stays, derived from the design colours.
4. The landing drops the handwriting font and Bricolage headings for Inter, as the design does.
5. Old URL redirects everything except calendar feeds, which keep working for 12 months.
6. The logo for now is the design's calendar-check mark; a real logo can replace `LogoMark` later in one place.
