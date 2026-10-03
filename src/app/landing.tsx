import Link from "next/link";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";

/** The public home page, shown at / to anyone who isn't signed in. */

const FEATURES = [
  {
    title: "Days left, always visible",
    body: "Set a yearly allowance per person. Everyone sees what they've taken, what's pending and what's left, with unused days carried over up to your cap.",
  },
  {
    title: "Half days",
    body: "Book a morning or an afternoon. Half days count as half, in the allowance and on the calendar.",
  },
  {
    title: "Public holidays by region",
    body: "Import holidays for your country, then let each person pick where they work. Berlin and Bielefeld get their own days off, automatically.",
  },
  {
    title: "Approvals when you want them",
    body: "Turn on approvals per workspace and admins approve or decline with a note. Leave it off and bookings go straight in.",
  },
  {
    title: "One calendar for the team",
    body: "See the whole month at a glance and get a warning before too many people are out on the same day.",
  },
  {
    title: "Microsoft Teams and Slack updates",
    body: "Bookings and approvals post to your Teams or Slack channel, and every weekday morning it says who's out.",
  },
  {
    title: "In your own calendar",
    body: "A private calendar feed puts your team's time off into Outlook, Google Calendar or Apple Calendar.",
  },
  {
    title: "Long-weekend tips",
    body: "It spots bridge days next to public holidays, so one booked day can turn into four days off.",
  },
  {
    title: "No passwords, invite only",
    body: "People sign in with a link sent to their email. Nobody gets into your workspace unless an admin invites them.",
  },
];

const STEPS = [
  { title: "Create a workspace", body: "Name your team, pick your time zone and set a default yearly allowance." },
  { title: "Invite your team", body: "Paste their emails. Each person gets a sign-in link, no account setup needed." },
  { title: "Book and plan", body: "People book days off, the calendar fills in, and Teams keeps everyone in the loop." },
];

const FAQ = [
  {
    q: "Who can see my bookings?",
    a: "Only people in your workspace. Sick days show to colleagues as \"Other\" without the note; only admins and the person see them as sick.",
  },
  {
    q: "Where is our data stored?",
    a: "In data centres in Frankfurt, in the EU. We sign a data processing agreement (AVV) with every customer and use no tracking cookies.",
  },
  {
    q: "Does it work for part-time staff and new starters?",
    a: "Yes. Set the days someone works and days off only count on those. In the year someone starts, the allowance is 1/12 per full month.",
  },
  {
    q: "Does it handle different German states?",
    a: "Yes. Import Germany's holidays, choose the team's main state, and anyone working elsewhere picks their own state.",
  },
  {
    q: "Can we change allowances later?",
    a: "Yes. Admins can change anyone's yearly allowance at any time, for one person or for everyone at once.",
  },
  {
    q: "Do people need a password?",
    a: "No. They enter their email and click the link we send them.",
  },
];

/* A small team calendar, drawn with plain elements so it stays sharp and themable. */
const TEAM = [
  { name: "Anna", days: "....vvvvv..........." },
  { name: "Ben", days: "..........hhpp......" },
  { name: "Clara", days: "s..................." },
  { name: "Deniz", days: "........vvvvvvv....." },
  { name: "Emil", days: "..............aa...." },
];
const CELL: Record<string, string> = {
  v: "bg-sky-500",
  h: "bg-sky-500 [clip-path:inset(0_50%_0_0)]",
  p: "pending-stripes bg-sky-500/70",
  s: "bg-amber-500",
  a: "bg-violet-500",
};

function CalendarPreview() {
  return (
    <figure className="card space-y-3 bg-background shadow-xl shadow-sky-900/10">
      <div
        role="img"
        aria-label="Example team calendar for two weeks: Anna on vacation for five days, Ben off for two half days with two days pending approval, Clara off sick for a day, Deniz away for a week, and Emil taking two other days off."
        className="space-y-1.5"
      >
        <div className="grid grid-cols-[3.5rem_repeat(20,minmax(0,1fr))] gap-px text-[10px] opacity-60" aria-hidden>
          <span />
          {Array.from({ length: 20 }, (_, i) => (
            <span key={i} className={`text-center ${i % 2 ? "invisible sm:visible" : ""}`}>
              {i + 1}
            </span>
          ))}
        </div>
        {TEAM.map((p) => (
          <div key={p.name} className="grid grid-cols-[3.5rem_repeat(20,minmax(0,1fr))] items-center gap-px" aria-hidden>
            <span className="truncate text-xs font-medium">{p.name}</span>
            {[...p.days].map((c, i) => (
              <span
                key={i}
                className={`h-4 ${c === "." ? (i % 7 === 5 || i % 7 === 6 ? "bg-black/10 dark:bg-white/10" : "bg-black/[0.04] dark:bg-white/[0.06]") : CELL[c]}`}
              />
            ))}
          </div>
        ))}
      </div>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-80">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-sky-500" /> Vacation
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" /> Sick
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-violet-500" /> Other
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="pending-stripes inline-block h-2.5 w-4 rounded-sm bg-sky-500" /> Pending
        </span>
      </figcaption>
    </figure>
  );
}

function AllowanceRing() {
  // 30 days: 12 taken, 3 pending, 15 left.
  const r = 52;
  const c = 2 * Math.PI * r;
  const arc = (days: number) => (days / 30) * c;
  return (
    <figure className="card flex flex-col items-center gap-4 text-center">
      <svg viewBox="0 0 140 140" className="h-40 w-40 -rotate-90" role="img" aria-labelledby="ring-title">
        <title id="ring-title">Allowance of 30 days: 12 taken, 3 pending, 15 left</title>
        <circle cx="70" cy="70" r={r} fill="none" strokeWidth="16" className="stroke-black/10 dark:stroke-white/15" />
        <circle cx="70" cy="70" r={r} fill="none" strokeWidth="16" className="stroke-sky-500" strokeDasharray={`${arc(12)} ${c}`} />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          strokeWidth="16"
          className="stroke-sky-300 dark:stroke-sky-700"
          strokeDasharray={`${arc(3)} ${c}`}
          strokeDashoffset={-arc(12)}
        />
      </svg>
      <figcaption className="space-y-1">
        <div className="text-3xl font-semibold">15 days left</div>
        <div className="text-sm opacity-70">of 30 · 12 taken · 3 pending</div>
      </figcaption>
    </figure>
  );
}

function BridgeDay() {
  const days = [
    { d: "Thu", n: "6 May", kind: "holiday", label: "Ascension Day" },
    { d: "Fri", n: "7 May", kind: "booked", label: "1 day booked" },
    { d: "Sat", n: "8 May", kind: "weekend", label: "Weekend" },
    { d: "Sun", n: "9 May", kind: "weekend", label: "Weekend" },
  ];
  const style: Record<string, string> = {
    holiday: "bg-rose-500/15 ring-rose-500/40",
    booked: "bg-sky-500 text-white ring-sky-600",
    weekend: "bg-black/5 ring-black/10 dark:bg-white/10 dark:ring-white/15",
  };
  return (
    <figure className="card space-y-4">
      <ol className="grid grid-cols-4 gap-2" aria-label="Thursday 6 May 2027 is Ascension Day, you book Friday, then the weekend follows">
        {days.map((x) => (
          <li key={x.d} className={`rounded-lg p-2 text-center ring-1 ${style[x.kind]}`}>
            <div className="text-xs opacity-80">{x.d}</div>
            <div className="font-semibold">{x.n}</div>
            <div className="mt-1 text-[11px] leading-tight">{x.label}</div>
          </li>
        ))}
      </ol>
      <figcaption className="text-center">
        <span className="text-3xl font-semibold">1 day booked, 4 days off</span>
        <span className="block text-sm opacity-70">Tips like this show up on your overview, based on your region&apos;s holidays.</span>
      </figcaption>
    </figure>
  );
}

function RegionCompare() {
  const rows = [
    { place: "Berlin", count: 10, extra: "International Women's Day" },
    { place: "Bielefeld (North Rhine-Westphalia)", count: 11, extra: "Corpus Christi and All Saints' Day" },
  ];
  return (
    <figure className="card space-y-4">
      <dl className="space-y-4">
        {rows.map((r) => (
          <div key={r.place} className="space-y-1.5">
            <dt className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{r.place}</span>
              <span className="opacity-70">{r.count} public holidays</span>
            </dt>
            <dd>
              <div className="flex h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/15" aria-hidden>
                <div className="bg-rose-500/70" style={{ width: `${(9 / 11) * 100}%` }} />
                <div className="bg-rose-500" style={{ width: `${((r.count - 9) / 11) * 100}%` }} />
              </div>
              <p className="mt-1 text-xs opacity-70">9 nationwide, plus {r.extra}</p>
            </dd>
          </div>
        ))}
      </dl>
      <figcaption className="text-sm opacity-80">
        Same company, different days off. Each person&apos;s holidays follow where they work, and never count against their allowance.
      </figcaption>
    </figure>
  );
}

export function Landing() {
  return (
    <div className="space-y-24 pb-8">
      <section className="grid items-center gap-10 pt-4 md:grid-cols-2" aria-labelledby="hero-title">
        <div className="space-y-6">
          <p className="text-sm font-medium text-sky-700 dark:text-sky-400">Vacation planning for teams</p>
          <h1 id="hero-title" className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Know who&apos;s out, and how many days everyone has left.
          </h1>
          <p className="text-lg opacity-80">
            Book vacation in a few taps, see the whole team on one calendar, and stop counting days in spreadsheets. Built for teams in
            Germany, with every state&apos;s public holidays.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/sign-in" className="btn px-5 py-3 text-base">
              Create your team&apos;s workspace
            </Link>
            <a href="#features" className="inline-flex items-center rounded-md px-4 py-3 font-medium underline">
              See what it does
            </a>
          </div>
          <p className="text-sm opacity-70">Got an invite? Sign in with the email it was sent to.</p>
        </div>
        <CalendarPreview />
      </section>

      <section id="features" className="scroll-mt-8 space-y-8" aria-labelledby="features-title">
        <div className="max-w-2xl space-y-2">
          <h2 id="features-title" className="text-3xl font-semibold tracking-tight">
            Everything a team needs for time off
          </h2>
          <p className="opacity-80">No HR suite, no training. Just the parts people actually use.</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="card space-y-1.5">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm opacity-80">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-8" aria-labelledby="numbers-title">
        <div className="max-w-2xl space-y-2">
          <h2 id="numbers-title" className="text-3xl font-semibold tracking-tight">
            The numbers, worked out for you
          </h2>
          <p className="opacity-80">Weekends, half days, holidays and carry-over are counted automatically.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <AllowanceRing />
          <BridgeDay />
          <RegionCompare />
        </div>
      </section>

      <section className="space-y-8" aria-labelledby="how-title">
        <h2 id="how-title" className="text-3xl font-semibold tracking-tight">
          Up and running in five minutes
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card flex gap-4">
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground font-semibold text-background"
              >
                {i + 1}
              </span>
              <div className="space-y-1">
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm opacity-80">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="pricing" className="scroll-mt-8 space-y-6" aria-labelledby="pricing-title">
        <div className="space-y-2">
          <h2 id="pricing-title" className="text-3xl font-semibold tracking-tight">
            Simple prices for the whole team
          </h2>
          <p className="opacity-80">
            One flat price per team, not per person. Every new workspace gets {TRIAL_DAYS} days with everything, no card needed.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {(["FREE", "TEAM", "BUSINESS"] as const).map((key) => {
            const plan = PLANS[key];
            return (
              <div key={key} className={`card space-y-2 ${key === "TEAM" ? "ring-2 ring-primary" : ""}`}>
                <h3 className="font-semibold">{plan.name}</h3>
                <p>
                  <span className="text-3xl font-semibold">€{plan.monthly}</span>
                  <span className="text-sm opacity-70"> / month</span>
                </p>
                <p className="text-sm opacity-80">
                  Up to {plan.maxMembers} people{plan.yearly > 0 ? `, or €${plan.yearly} a year` : ""}.{" "}
                  {plan.chat ? "Everything, including Teams and Slack." : "Everything except Teams and Slack posts."}
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-sm opacity-70">Prices plus VAT. More than {PLANS.BUSINESS.maxMembers} people? Get in touch for an offer.</p>
      </section>

      <section className="space-y-6" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-3xl font-semibold tracking-tight">
          Questions
        </h2>
        <div className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-4">
              <summary className="cursor-pointer list-none font-medium">
                <span className="flex items-center justify-between gap-4">
                  {f.q}
                  <span aria-hidden className="transition-transform group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-2 text-sm opacity-80">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="card space-y-4 py-10 text-center" aria-labelledby="cta-title">
        <h2 id="cta-title" className="text-2xl font-semibold tracking-tight">
          Plan the next holiday season together
        </h2>
        <p className="mx-auto max-w-xl opacity-80">Create a workspace, invite your team and book the first days off today.</p>
        <Link href="/sign-in" className="btn px-5 py-3 text-base">
          Get started
        </Link>
      </section>
    </div>
  );
}
