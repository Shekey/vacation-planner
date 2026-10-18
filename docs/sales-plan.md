# Vacation Planner: plan for selling it

Written 2026-10-17. What is done, what to build next, what it costs, and how to find customers. The concrete setup steps (hosting, legal, Stripe) are in the README under "Before you sell: your to-do list".

## 1. Who we sell to

Teams of **5 to 75 people without an IT department**, where someone always has to be at work and the boss decides alone:

| Segment | Why they need it | What they care about |
|---|---|---|
| Medical and dental practices, physiotherapy, pharmacies | Reception and treatment rooms must stay covered; summer is planned months ahead | Minimum staffing, approvals, data protection |
| Outpatient care services and care homes | Part-time contracts, weekend shifts, many people | Work days per person, mobile use, staffing |
| Kitas and daycare | Holidays planned in January, closing days, enough staff per group | Approvals, overview, carry-over deadline |
| Trades and workshops | Company holidays, busy seasons, staff in different states | Regional holidays, simple overview |
| Restaurants, hotels, shops | High season, weekends | Staffing warning, phone use |
| Offices, agencies, tax and law firms | Busy seasons, Outlook | Days left, calendar feed, Teams/Slack |

**Not now:** hospitals and large care groups. Long tenders, works councils, shift-planning systems they already use, and IT security questionnaires we can't answer yet.

## 2. Prices

Flat price per team, not per person (easy to understand, nobody counts heads):

| Plan | People | Monthly | Yearly | Per person at full size |
|---|---|---|---|---|
| Free | up to 5 | €0 | €0 | — |
| Team | up to 25 | €39 | €390 | €1.56 |
| Business | up to 75 | €89 | €890 | €1.19 |
| More than 75 | — | offer, about €1 per person | | |

All prices are net (plus VAT). The 30-day trial includes everything. Yearly is two months free.

Why these numbers: per-person tools in this market cost roughly €1.50 to €4 per person and month (absence.io about €3 to €5 per person by plan, Vacation Tracker $2 to $4, Timetastic $1.50 to $2.50; from review sites on 2026-10-18, check their own price pages before changing anything). For a team of 8 we are mid-range, from 15 people up we are the cheapest by a wide margin, so the flat prices were raised: Team €29 → €39, Business €69 → €89. Running costs are about €150 to €350 a month before the first customer (hosting €25 to €60, the rest tax advisor, legal and insurance), so 5 to 10 paying teams cover everything; the margin per customer is about 95%, which means the price follows the value to the customer, not our costs. If teams of 6 to 10 hesitate at €39, add a small plan up to 10 people at €29 (needs a new `Plan` value and Stripe prices).

**Setup service for bigger teams:** moving 50 people from Excel is the biggest obstacle. Admins can import people and their time off themselves (Members → Import). For those who would rather not, we do it for €99 once (`SETUP_SERVICE_EUR`), included with a yearly Business plan.

Changing prices later: edit `PLANS` in `src/lib/plans.ts` (landing page, billing page and terms follow), create new prices in Stripe and set the `STRIPE_PRICE_*` variables. Existing subscribers keep their old Stripe price until you move them.

## 3. What changed in this round

- **Landing page** rewritten for selling: a clear promise ("without Excel, without WhatsApp"), trust badges (EU data, DPA, holidays, no tracking), a section with **examples for six kinds of teams** (practice, care, Kita, trades, restaurant, office), a before/after comparison, icons on features, pricing cards with what's included, "most popular" and price per person, more FAQ answers (shifts, no IT needed, after the trial), anchor links in the header. The examples are labelled as examples. Replace them with real customer quotes once you have some.
- **Guided setup**: creating a workspace asks for the kind of team (sets approvals and a typical allowance), the yearly vacation days and the country and state, then imports public holidays straight away.
- **Getting-started checklist** with a progress bar, a short "why" for each step, the next step highlighted, and a new step for minimum staffing.
- **First visit without a workspace** now explains both paths: set up a team, or wait for an invite (with the email address to give the admin).
- **Allowance history**: changing someone's allowance (or applying the default to everyone) keeps last year's value, so the days carried over into this year no longer change after the fact.
- **Prices** raised as above.

## 4. What to build next (in this order)

Each item is something customers in the segments above will ask for. Rough size in brackets.

1. **Company-wide closures** (medium): a closure day or week for everyone (practice holidays, Kita closing days, company holidays in trades) that takes days from everyone's allowance in one step. Biggest single gap for practices, Kitas and trades.
2. **People without email** (medium): admins add a person by name only and book for them. Many nurses, cooks and trades staff have no work email.
3. **Payroll export** (small): a monthly list per person (vacation, other time off, days left) as CSV and printable PDF for the tax advisor. This reverses the earlier "no CSV export" decision; customers' accountants need it.
4. **More leave types** (medium): special leave, unpaid leave, training, overtime off, each with "counts against allowance" on or off.
5. **Minimum staffing per group** (medium): e.g. "at least 1 dentist and 2 assistants", instead of one number for the whole workspace.
6. **Audit log** (small, built 2026-10-18: *Activity* page for admins, kept 12 months, together with 30-day undo for removed people, cancelled bookings and deleted workspaces). Still open: log more events (settings, allowances, invitations), roles beyond Admin and Member, and a super-admin area for the operator.
7. **Proof of the expiry notice** (small): German law (BAG/CJEU) says leftover days only expire if the employer told the person in good time. Send the "your days expire on …" reminder by email and store when it was sent.
8. **Sick leave as an opt-in** (medium, needs a lawyer's OK first): off by default, no reason or note, never counted against the allowance, visible only to the person and admins, shown as "absent" to colleagues and in chat posts, deleted earlier than other bookings, and "sick during vacation" gives the days back. Under GDPR even a bare "sick on this day" flag is health data (Art. 9), so the DPA must say so when a workspace turns it on. Never build sick-day statistics or rankings.
9. **Hours instead of days** (large): for care and retail with irregular shifts.
10. **Leave years not matching the calendar year, monthly accrual, more languages** (large): needed for France, the Netherlands, Spain and others. Stay focused on Germany, Austria and Switzerland until there are paying customers.

Ideas from what competitors offer (absence.io, Personio, Vacation Tracker, Timetastic; from general market knowledge, not a checked feature comparison), in the order I would build them for our customers:

- **Groups with their own minimum staffing and a calendar filter** (reception, treatment, nursing): the department view every competitor has, and what a practice needs for "at least 1 dentist and 2 assistants". Same as item 5 above, plus the filter.
- **People without email** (item 2 above) moves up: many care and trades employees have no work email, and the Excel import can only add people with an address.
- **Substitute ("Vertretung")**: when booking, pick who covers; shown on the calendar and in the approval. Common in German practices, cheap to build.
- **Request and approve inside Teams or Slack** (buttons or a command): Vacation Tracker's core feature; we only post today. Medium to large.
- **Set the Teams or Slack status to "away"** and write the absence into Outlook or Google calendars: medium, nice for office teams.
- **Installable on the phone** (home-screen icon, works offline for the calendar): small, helps shift and trades teams.
- **Payroll export, custom leave types, company closures**: already items 1, 3 and 4 above.
- **Sign in with Microsoft or Google**: low priority, magic links already need no password.
- Not for us now: time tracking, shift planning, multi-level approval chains, overtime accounts.

Smaller ideas already noted: undo after cancel, a reminder the day before, admin view of who has the most days left, calendar filter, selecting a range on the calendar.

## 5. How to find customers

1. **Friendly pilots** (weeks 1 to 4): 3 to 5 local businesses (your own dentist, a care service, a trades business), free for 3 months, in return for feedback and a quote.
2. **Local and direct** (month 2 on): visit or call practices and care services nearby with a one-page flyer (screenshot, three sentences, price, link). Practice managers decide quickly.
3. **Partners**: tax advisors and payroll offices see the vacation chaos of all their clients. Offer them a free workspace and a referral discount for their clients.
4. **Where they search**: a Google Business profile, entries in software directories (e.g. Capterra, OMR Reviews), and simple pages per segment ("Urlaubsplanung für Zahnarztpraxen", "Urlaubsplaner für Pflegedienste") that link to the landing page.
5. **Industry groups**: Facebook and LinkedIn groups of practice managers, Kita leaders and trades associations; answer questions there, don't spam.

Measure from the start: visitors, workspaces created, workspaces with 3+ people after 7 days, trials that pay. A good first goal: 10 paying teams.
