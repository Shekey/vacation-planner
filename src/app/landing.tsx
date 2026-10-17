import Link from "next/link";
import { HeroDemo } from "@/components/landing/hero-demo";
import { icons } from "@/components/landing/icons";
import { PricePicker } from "@/components/landing/price-picker";
import { Reveal } from "@/components/landing/reveal";
import { TeamSwitcher } from "@/components/landing/team-switcher";
import { intlLocale, type Locale, type Messages } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { OPERATOR } from "@/lib/legal";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";

/** The public home page, shown at / to anyone who isn't signed in. */

type T = Messages["landing"];

const panel = "rounded-2xl border border-border bg-surface p-5";

function AllowanceRing({ t }: { t: T }) {
  // 30 days: 12 taken, 3 pending, 15 left.
  const r = 52;
  const c = 2 * Math.PI * r;
  const arc = (days: number) => (days / 30) * c;
  return (
    <figure className={`${panel} flex flex-col items-center gap-4 text-center`}>
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
        <div className="font-display text-3xl font-semibold">{t.ring.left}</div>
        <div className="text-sm text-muted">{t.ring.detail}</div>
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
    <figure className={`${panel} space-y-4`}>
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
        <span className="font-display text-3xl font-semibold">{t.bridge.result}</span>
        <span className="block text-sm text-muted">{t.bridge.note}</span>
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
    <figure className={`${panel} space-y-4`}>
      <dl className="space-y-4">
        {rows.map((r) => (
          <div key={r.place} className="space-y-1.5">
            <dt className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{r.place}</span>
              <span className="text-muted">{t.regions.count(r.count)}</span>
            </dt>
            <dd>
              <div className="flex h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/15" aria-hidden>
                <div className="bg-rose-500/70" style={{ width: `${(9 / 11) * 100}%` }} />
                <div className="bg-rose-500" style={{ width: `${((r.count - 9) / 11) * 100}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted">{t.regions.breakdown(9, r.extra)}</p>
            </dd>
          </div>
        ))}
      </dl>
      <figcaption className="text-sm text-muted">{t.regions.note}</figcaption>
    </figure>
  );
}

/** The sun-over-waves from the logo, used as a quiet signature in the hero and the closing section. */
function Sun({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <g className="sun-turn">
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x="58" y="4" width="4" height="14" rx="2" fill="currentColor" transform={`rotate(${i * 30} 60 60)`} />
        ))}
      </g>
      <circle cx="60" cy="60" r="26" fill="currentColor" />
    </svg>
  );
}

function Waves({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 400 40" preserveAspectRatio="none" className={className} aria-hidden>
      <path d="M0 20c33-14 67-14 100 0s67 14 100 0 67-14 100 0 67 14 100 0" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M0 32c33-14 67-14 100 0s67 14 100 0 67-14 100 0 67 14 100 0" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
    </svg>
  );
}

function Heading({ id, title, subtitle }: { id: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-2xl space-y-3">
      <h2 id={id} className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-[2.5rem] sm:leading-[1.1]">
        {title}
      </h2>
      {subtitle && <p className="text-lg text-muted">{subtitle}</p>}
    </div>
  );
}

export async function Landing() {
  const [locale, m] = await Promise.all([getLocale(), getMessages()]);
  const t = m.landing;
  return (
    <div className="space-y-24 pb-8 sm:space-y-32">
      {/* ---------- Hero ---------- */}
      <section className="relative grid items-center gap-12 pt-2 sm:pt-8 lg:grid-cols-[1.05fr_1fr]" aria-labelledby="hero-title">
        <Sun className="pointer-events-none absolute -top-10 right-0 -z-10 size-40 text-amber-300/40 sm:size-56 dark:text-amber-300/15" />
        <div className="space-y-7">
          <h1
            id="hero-title"
            className="font-display text-[2.6rem] leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl"
          >
            {t.hero.titleLead}{" "}
            <span className="scribble text-sky-700 dark:text-sky-300">{t.hero.titleAccent}</span>
          </h1>
          <p className="max-w-xl text-lg text-muted">{t.hero.body}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/sign-in" className="btn px-5 py-3 text-base">
              {t.hero.cta(TRIAL_DAYS)}
            </Link>
            <a href="#pricing" className="btn-secondary px-5 py-3 text-base">
              {t.hero.pricing}
            </a>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted">
            {t.hero.ticks.map((tick) => (
              <li key={tick} className="flex items-center gap-1.5">
                <icons.check className="size-4 text-green-600 dark:text-green-400" />
                {tick}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">{t.hero.invite}</p>
        </div>
        <HeroDemo />
      </section>

      <ul
        className="-mt-12 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted sm:-mt-20"
        aria-label={t.trust.label}
      >
        {t.trust.items.map((item) => (
          <li key={item} className="flex items-center gap-1.5 whitespace-nowrap">
            <icons.check className="size-4 text-sky-600 dark:text-sky-400" />
            {item}
          </li>
        ))}
      </ul>

      {/* ---------- Who it's for ---------- */}
      <Reveal>
        <section id="for-whom" className="scroll-mt-20 space-y-10" aria-labelledby="audiences-title">
          <Heading id="audiences-title" title={t.audiences.title} subtitle={t.audiences.subtitle} />
          <TeamSwitcher />
        </section>
      </Reveal>

      {/* ---------- Before / after ---------- */}
      <Reveal>
        <section className="space-y-10" aria-labelledby="compare-title">
          <Heading id="compare-title" title={t.compare.title} />
          <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
            <figure className="relative mx-auto w-full max-w-sm -rotate-2 rounded-sm bg-amber-100 p-6 pt-8 text-stone-800 shadow-[0_18px_30px_-12px_rgb(120_80_0/0.35)] dark:bg-amber-200">
              <span aria-hidden className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 rotate-2 bg-white/60 shadow-sm" />
              <figcaption className="sr-only">{t.compare.beforeTitle}</figcaption>
              <ul className="font-hand space-y-1.5 text-2xl leading-snug">
                {t.compare.note.map((line, i) => (
                  <li key={line} className={i === 0 || i === 2 ? "line-through decoration-red-500/70 decoration-2" : ""}>
                    {line}
                  </li>
                ))}
              </ul>
            </figure>
            <div className="space-y-4">
              <h3 className="font-display text-xl font-semibold">{t.compare.afterTitle}</h3>
              <ul className="space-y-3">
                {t.compare.after.map((line) => (
                  <li key={line} className="flex gap-3">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-green-600/10 text-green-700 dark:text-green-400">
                      <icons.check className="size-4" />
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ---------- Features ---------- */}
      <Reveal>
        <section id="features" className="scroll-mt-20 space-y-10" aria-labelledby="features-title">
          <Heading id="features-title" title={t.features.title} subtitle={t.features.subtitle} />
          <ul className="grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {t.features.items.map((f) => {
              const Icon = icons[f.icon];
              return (
                <li key={f.title} className="space-y-2">
                  <Icon className="size-7 text-sky-600 dark:text-sky-400" />
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted">{f.body}</p>
                </li>
              );
            })}
          </ul>
        </section>
      </Reveal>

      {/* ---------- Numbers ---------- */}
      <Reveal>
        <section className="space-y-10" aria-labelledby="numbers-title">
          <Heading id="numbers-title" title={t.numbers.title} subtitle={t.numbers.subtitle} />
          <div className="grid gap-4 md:grid-cols-3">
            <AllowanceRing t={t} />
            <BridgeDay t={t} locale={locale} />
            <RegionCompare t={t} />
          </div>
        </section>
      </Reveal>

      {/* ---------- Steps ---------- */}
      <Reveal>
        <section className="space-y-10" aria-labelledby="how-title">
          <Heading id="how-title" title={t.steps.title} />
          <ol className="grid gap-8 md:grid-cols-3">
            {t.steps.items.map((s, i) => (
              <li key={s.title} className="relative space-y-2 border-t-2 border-foreground pt-4">
                <span aria-hidden className="font-display text-4xl font-semibold text-sky-600 dark:text-sky-400">
                  {i + 1}
                </span>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </Reveal>

      {/* ---------- Pricing ---------- */}
      <Reveal>
        <section id="pricing" className="scroll-mt-20 space-y-10" aria-labelledby="pricing-title">
          <Heading id="pricing-title" title={t.pricing.title} subtitle={t.pricing.subtitle(TRIAL_DAYS)} />
          <PricePicker contactEmail={OPERATOR.email} />
          <p className="text-sm text-muted">{t.pricing.footnote(PLANS.BUSINESS.maxMembers)}</p>
        </section>
      </Reveal>

      {/* ---------- FAQ ---------- */}
      <Reveal>
        <section id="faq" className="scroll-mt-20 grid gap-8 lg:grid-cols-[1fr_2fr]" aria-labelledby="faq-title">
          <Heading id="faq-title" title={t.faq.title} />
          <div className="divide-y divide-border border-y border-border">
            {t.faq.items.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {f.q}
                  <span
                    aria-hidden
                    className="grid size-7 shrink-0 place-items-center rounded-full border border-border text-muted transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-2 pr-10 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ---------- Closing ---------- */}
      <section
        className="relative overflow-hidden rounded-3xl bg-[#0f2433] px-6 pt-14 pb-20 text-center text-white sm:px-12"
        aria-labelledby="cta-title"
      >
        <Sun className="absolute -top-8 right-6 size-28 text-amber-300 sm:right-16 sm:size-36" />
        <div className="relative mx-auto max-w-xl space-y-5">
          <h2 id="cta-title" className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {t.cta.title}
          </h2>
          <p className="text-white/75">{t.cta.body}</p>
          <Link
            href="/sign-in"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-amber-300 px-6 py-3 font-semibold text-stone-900 transition-colors hover:bg-amber-200"
          >
            {t.cta.button}
          </Link>
        </div>
        <Waves className="absolute inset-x-0 bottom-4 h-8 w-full text-sky-300/40" />
      </section>
    </div>
  );
}
