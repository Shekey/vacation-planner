import Link from "next/link";
import { intlLocale, type Locale, type Messages } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";

/** The public home page, shown at / to anyone who isn't signed in. */

type T = Messages["landing"];

/* A small team calendar, drawn with plain elements so it stays sharp and themable. */
const TEAM = [
  { name: "Anna", days: "....vvvvv..........." },
  { name: "Ben", days: "..........hhpp......" },
  { name: "Clara", days: "vv.................." },
  { name: "Deniz", days: "........vvvvvvv....." },
  { name: "Emil", days: "..............aa...." },
];
const CELL: Record<string, string> = {
  v: "bg-sky-500",
  h: "bg-sky-500 [clip-path:inset(0_50%_0_0)]",
  p: "pending-stripes bg-sky-500/70",
  a: "bg-violet-500",
};

function CalendarPreview({ t }: { t: T }) {
  return (
    <figure className="card space-y-3 bg-background shadow-xl shadow-sky-900/10">
      <div role="img" aria-label={t.preview.label} className="space-y-1.5">
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
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-sky-500" /> {t.preview.vacation}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-violet-500" /> {t.preview.other}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="pending-stripes inline-block h-2.5 w-4 rounded-sm bg-sky-500" /> {t.preview.pending}
        </span>
      </figcaption>
    </figure>
  );
}

function AllowanceRing({ t }: { t: T }) {
  // 30 days: 12 taken, 3 pending, 15 left.
  const r = 52;
  const c = 2 * Math.PI * r;
  const arc = (days: number) => (days / 30) * c;
  return (
    <figure className="card flex flex-col items-center gap-4 text-center">
      <svg viewBox="0 0 140 140" className="h-40 w-40 -rotate-90" role="img" aria-labelledby="ring-title">
        <title id="ring-title">{t.ring.label}</title>
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
        <div className="text-3xl font-semibold">{t.ring.left}</div>
        <div className="text-sm opacity-70">{t.ring.detail}</div>
      </figcaption>
    </figure>
  );
}

function BridgeDay({ t, locale }: { t: T; locale: Locale }) {
  // Thursday 6 May 2027 to Sunday 9 May 2027.
  const weekday = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short", timeZone: "UTC" });
  const dayMonth = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", timeZone: "UTC" });
  const kinds = [
    { kind: "holiday", label: t.bridge.holiday },
    { kind: "booked", label: t.bridge.booked },
    { kind: "weekend", label: t.bridge.weekend },
    { kind: "weekend", label: t.bridge.weekend },
  ];
  const days = kinds.map((k, i) => {
    const date = new Date(Date.UTC(2027, 4, 6 + i));
    return { d: weekday.format(date), n: dayMonth.format(date), ...k };
  });
  const style: Record<string, string> = {
    holiday: "bg-rose-500/15 ring-rose-500/40",
    booked: "bg-sky-500 text-white ring-sky-600",
    weekend: "bg-black/5 ring-black/10 dark:bg-white/10 dark:ring-white/15",
  };
  return (
    <figure className="card space-y-4">
      <ol className="grid grid-cols-4 gap-2" aria-label={t.bridge.label}>
        {days.map((x) => (
          <li key={x.d} className={`rounded-lg p-2 text-center ring-1 ${style[x.kind]}`}>
            <div className="text-xs opacity-80">{x.d}</div>
            <div className="font-semibold">{x.n}</div>
            <div className="mt-1 text-[11px] leading-tight">{x.label}</div>
          </li>
        ))}
      </ol>
      <figcaption className="text-center">
        <span className="text-3xl font-semibold">{t.bridge.result}</span>
        <span className="block text-sm opacity-70">{t.bridge.note}</span>
      </figcaption>
    </figure>
  );
}

function RegionCompare({ t }: { t: T }) {
  const rows = [
    { place: t.regions.berlin, count: 10, extra: t.regions.berlinExtra },
    { place: t.regions.bielefeld, count: 11, extra: t.regions.bielefeldExtra },
  ];
  return (
    <figure className="card space-y-4">
      <dl className="space-y-4">
        {rows.map((r) => (
          <div key={r.place} className="space-y-1.5">
            <dt className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{r.place}</span>
              <span className="opacity-70">{t.regions.count(r.count)}</span>
            </dt>
            <dd>
              <div className="flex h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/15" aria-hidden>
                <div className="bg-rose-500/70" style={{ width: `${(9 / 11) * 100}%` }} />
                <div className="bg-rose-500" style={{ width: `${((r.count - 9) / 11) * 100}%` }} />
              </div>
              <p className="mt-1 text-xs opacity-70">{t.regions.breakdown(9, r.extra)}</p>
            </dd>
          </div>
        ))}
      </dl>
      <figcaption className="text-sm opacity-80">{t.regions.note}</figcaption>
    </figure>
  );
}

export async function Landing() {
  const [locale, m] = await Promise.all([getLocale(), getMessages()]);
  const t = m.landing;
  const euro = (n: number) =>
    new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  return (
    <div className="space-y-24 pb-8">
      <section className="grid items-center gap-10 pt-4 md:grid-cols-2" aria-labelledby="hero-title">
        <div className="space-y-6">
          <p className="text-sm font-medium text-sky-700 dark:text-sky-400">{t.hero.eyebrow}</p>
          <h1 id="hero-title" className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {t.hero.title}
          </h1>
          <p className="text-lg opacity-80">{t.hero.body}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/sign-in" className="btn px-5 py-3 text-base">
              {t.hero.cta}
            </Link>
            <a href="#features" className="inline-flex items-center rounded-md px-4 py-3 font-medium underline">
              {t.hero.more}
            </a>
          </div>
          <p className="text-sm opacity-70">{t.hero.invite}</p>
        </div>
        <CalendarPreview t={t} />
      </section>

      <section id="features" className="scroll-mt-8 space-y-8" aria-labelledby="features-title">
        <div className="max-w-2xl space-y-2">
          <h2 id="features-title" className="text-3xl font-semibold tracking-tight">
            {t.features.title}
          </h2>
          <p className="opacity-80">{t.features.subtitle}</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.features.items.map((f) => (
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
            {t.numbers.title}
          </h2>
          <p className="opacity-80">{t.numbers.subtitle}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <AllowanceRing t={t} />
          <BridgeDay t={t} locale={locale} />
          <RegionCompare t={t} />
        </div>
      </section>

      <section className="space-y-8" aria-labelledby="how-title">
        <h2 id="how-title" className="text-3xl font-semibold tracking-tight">
          {t.steps.title}
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {t.steps.items.map((s, i) => (
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
            {t.pricing.title}
          </h2>
          <p className="opacity-80">{t.pricing.subtitle(TRIAL_DAYS)}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {(["FREE", "TEAM", "BUSINESS"] as const).map((key) => {
            const plan = PLANS[key];
            return (
              <div key={key} className={`card space-y-2 ${key === "TEAM" ? "ring-2 ring-primary" : ""}`}>
                <h3 className="font-semibold">{plan.name}</h3>
                <p>
                  <span className="text-3xl font-semibold">{euro(plan.monthly)}</span>
                  <span className="text-sm opacity-70">{t.pricing.perMonth}</span>
                </p>
                <p className="text-sm opacity-80">
                  {t.pricing.upTo(plan.maxMembers)}
                  {plan.yearly > 0 ? t.pricing.orYearly(euro(plan.yearly)) : ""}. {plan.chat ? t.pricing.withChat : t.pricing.withoutChat}
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-sm opacity-70">{t.pricing.footnote(PLANS.BUSINESS.maxMembers)}</p>
      </section>

      <section className="space-y-6" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-3xl font-semibold tracking-tight">
          {t.faq.title}
        </h2>
        <div className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
          {t.faq.items.map((f) => (
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
          {t.cta.title}
        </h2>
        <p className="mx-auto max-w-xl opacity-80">{t.cta.body}</p>
        <Link href="/sign-in" className="btn px-5 py-3 text-base">
          {t.cta.button}
        </Link>
      </section>
    </div>
  );
}
