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

/* Small notifications floating around the hero calendar, the way the app tells people things. */
function Toast({ className, icon, children }: { className: string; icon: string; children: React.ReactNode }) {
  return (
    <div
      aria-hidden
      className={`float absolute z-10 flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium whitespace-nowrap shadow-lg shadow-sky-900/10 ${className}`}
    >
      <span>{icon}</span>
      {children}
    </div>
  );
}

function HeroVisual({ t }: { t: T }) {
  return (
    <div className="relative pt-6 pb-8 sm:px-4">
      <Toast className="-top-1 left-2 sm:left-0" icon="✅">
        {t.hero.toastApproved}
      </Toast>
      <CalendarPreview t={t} />
      <Toast className="right-2 -bottom-1 [animation-delay:1.5s] sm:right-0" icon="⚠️">
        {t.hero.toastWarning}
      </Toast>
      <Toast className="top-1/2 right-0 hidden [animation-delay:0.8s] lg:flex" icon="🌴">
        {t.hero.toastLeft}
      </Toast>
    </div>
  );
}

function CalendarPreview({ t }: { t: T }) {
  return (
    <figure className="card space-y-3 bg-surface shadow-2xl shadow-sky-900/15">
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

function SectionHeading({ id, title, subtitle, center }: { id: string; title: string; subtitle?: string; center?: boolean }) {
  return (
    <div className={`max-w-2xl space-y-2 ${center ? "mx-auto text-center" : ""}`}>
      <h2 id={id} className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="text-lg text-muted">{subtitle}</p>}
    </div>
  );
}

export async function Landing() {
  const [locale, m] = await Promise.all([getLocale(), getMessages()]);
  const t = m.landing;
  const euro = (n: number, decimals = 0) =>
    new Intl.NumberFormat(intlLocale(locale), {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  return (
    <div className="space-y-24 pb-8 sm:space-y-28">
      <section className="relative grid items-center gap-10 overflow-x-clip pt-4 md:grid-cols-2" aria-labelledby="hero-title">
        {/* Soft color behind the hero; purely decorative. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-[34rem] bg-[radial-gradient(40rem_20rem_at_20%_20%,rgb(14_165_233/0.18),transparent),radial-gradient(30rem_18rem_at_85%_40%,rgb(20_184_166/0.16),transparent)]"
        />
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-sm font-medium text-sky-700 dark:text-sky-300">
            <span aria-hidden>🌴</span> {t.hero.eyebrow}
          </p>
          <h1 id="hero-title" className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {t.hero.title}
          </h1>
          <p className="text-lg text-muted">{t.hero.body}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/sign-in" className="btn px-5 py-3 text-base shadow-lg shadow-sky-600/25">
              {t.hero.cta(TRIAL_DAYS)}
            </Link>
            <a href="#pricing" className="btn-secondary px-5 py-3 text-base">
              {t.hero.pricing}
            </a>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            {t.hero.ticks.map((tick) => (
              <li key={tick} className="flex items-center gap-1.5">
                <span aria-hidden className="font-semibold text-green-600 dark:text-green-400">
                  ✓
                </span>
                {tick}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">{t.hero.invite}</p>
        </div>
        <HeroVisual t={t} />
      </section>

      <section aria-label={t.trust.label} className="-mt-8 sm:-mt-12">
        <ul className="flex flex-wrap justify-center gap-2">
          {t.trust.items.map((item) => (
            <li
              key={item.text}
              className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm shadow-xs"
            >
              <span aria-hidden>{item.icon}</span>
              {item.text}
            </li>
          ))}
        </ul>
      </section>

      <section id="for-whom" className="scroll-mt-20 space-y-8" aria-labelledby="audiences-title">
        <SectionHeading id="audiences-title" title={t.audiences.title} subtitle={t.audiences.subtitle} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.audiences.items.map((a) => (
            <li key={a.title} className="card card-link flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-2xl">
                  {a.icon}
                </span>
                <h3 className="font-semibold leading-snug">{a.title}</h3>
              </div>
              <p className="flex-1 text-sm text-muted">
                <span className="mr-1.5 rounded bg-black/5 px-1.5 py-0.5 text-[11px] font-medium tracking-wide uppercase dark:bg-white/10">
                  {t.audiences.example}
                </span>
                {a.story}
              </p>
              <ul className="flex flex-wrap gap-1.5" aria-label={a.title}>
                {a.tags.map((tag) => (
                  <li key={tag} className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-800 dark:text-sky-300">
                    {tag}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-8" aria-labelledby="compare-title">
        <SectionHeading id="compare-title" title={t.compare.title} center />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card space-y-3 bg-black/[0.02] dark:bg-white/[0.02]">
            <h3 className="font-semibold text-muted">{t.compare.beforeTitle}</h3>
            <ul className="space-y-2.5">
              {t.compare.before.map((line) => (
                <li key={line} className="flex gap-2.5 text-sm text-muted">
                  <span aria-hidden className="text-red-500">
                    ✕
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="card space-y-3 ring-2 ring-primary/40">
            <h3 className="font-semibold">{t.compare.afterTitle}</h3>
            <ul className="space-y-2.5">
              {t.compare.after.map((line) => (
                <li key={line} className="flex gap-2.5 text-sm">
                  <span aria-hidden className="font-semibold text-green-600 dark:text-green-400">
                    ✓
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-20 space-y-8" aria-labelledby="features-title">
        <SectionHeading id="features-title" title={t.features.title} subtitle={t.features.subtitle} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.features.items.map((f) => (
            <li key={f.title} className="card space-y-2">
              <span aria-hidden className="grid size-9 place-items-center rounded-lg bg-primary/10 text-lg">
                {f.icon}
              </span>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-8" aria-labelledby="numbers-title">
        <SectionHeading id="numbers-title" title={t.numbers.title} subtitle={t.numbers.subtitle} />
        <div className="grid gap-4 md:grid-cols-3">
          <AllowanceRing t={t} />
          <BridgeDay t={t} locale={locale} />
          <RegionCompare t={t} />
        </div>
      </section>

      <section className="space-y-8" aria-labelledby="how-title">
        <SectionHeading id="how-title" title={t.steps.title} />
        <ol className="grid gap-4 md:grid-cols-3">
          {t.steps.items.map((s, i) => (
            <li key={s.title} className="card flex gap-4">
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground"
              >
                {i + 1}
              </span>
              <div className="space-y-1">
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="pricing" className="scroll-mt-20 space-y-8" aria-labelledby="pricing-title">
        <SectionHeading id="pricing-title" title={t.pricing.title} subtitle={t.pricing.subtitle(TRIAL_DAYS)} center />
        <div className="grid items-start gap-4 md:grid-cols-3">
          {(["FREE", "TEAM", "BUSINESS"] as const).map((key) => {
            const plan = PLANS[key];
            const popular = key === "TEAM";
            return (
              <div
                key={key}
                className={`card relative flex h-full flex-col gap-4 ${popular ? "ring-2 ring-primary shadow-xl shadow-sky-900/10 md:-translate-y-2" : ""}`}
              >
                {popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                    {t.pricing.popular}
                  </span>
                )}
                <div className="space-y-1">
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="text-sm text-muted">{t.pricing.upTo(plan.maxMembers)}</p>
                </div>
                <div>
                  <p>
                    <span className="text-4xl font-semibold tracking-tight">{euro(plan.monthly)}</span>
                    <span className="text-sm text-muted">{t.pricing.perMonth}</span>
                  </p>
                  {plan.yearly > 0 && (
                    <p className="mt-1 text-xs text-muted">
                      {t.pricing.orYearly(euro(plan.yearly))}
                      <br />
                      {t.pricing.perPerson(euro(plan.monthly / plan.maxMembers, 2))}
                    </p>
                  )}
                </div>
                <ul className="flex-1 space-y-2 text-sm">
                  {t.pricing.features[key].map((f) => (
                    <li key={f} className="flex gap-2">
                      <span aria-hidden className="font-semibold text-green-600 dark:text-green-400">
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/sign-in" className={popular ? "btn w-full" : "btn-secondary w-full"}>
                  {key === "FREE" ? t.pricing.startFree : t.pricing.start}
                </Link>
              </div>
            );
          })}
        </div>
        <p className="text-center text-sm text-muted">{t.pricing.footnote(PLANS.BUSINESS.maxMembers)}</p>
      </section>

      <section id="faq" className="scroll-mt-20 space-y-6" aria-labelledby="faq-title">
        <SectionHeading id="faq-title" title={t.faq.title} />
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {t.faq.items.map((f) => (
            <details key={f.q} className="group p-4 sm:px-5">
              <summary className="cursor-pointer list-none font-medium">
                <span className="flex items-center justify-between gap-4">
                  {f.q}
                  <span aria-hidden className="text-xl leading-none text-muted transition-transform group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-2 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 to-teal-600 px-6 py-12 text-center text-white shadow-xl shadow-sky-900/20"
        aria-labelledby="cta-title"
      >
        <div className="mx-auto max-w-xl space-y-4">
          <h2 id="cta-title" className="text-3xl font-semibold tracking-tight">
            {t.cta.title}
          </h2>
          <p className="text-white/85">{t.cta.body}</p>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 font-semibold text-sky-800 shadow-sm transition-colors hover:bg-sky-50"
          >
            {t.cta.button}
          </Link>
        </div>
      </section>
    </div>
  );
}
