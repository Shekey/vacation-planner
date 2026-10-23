import { ArrowRight, Check, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { BetaPricing } from "@/components/landing/beta-pricing";
import { HeroCalendar } from "@/components/landing/hero-calendar";
import { PricePicker } from "@/components/landing/price-picker";
import { LanguageSwitch } from "@/components/language-switch";
import { LogoMark } from "@/components/ui";
import { isBetaMode } from "@/lib/beta";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { OPERATOR } from "@/lib/legal";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";

/** The public home page, shown at / to anyone who isn't signed in. It brings its own nav and footer (see `.landing` in globals.css). */

const eyebrow = "text-[11px] font-semibold tracking-wide text-primary-ink uppercase";
const h2 = "text-[30px] leading-[1.14] font-medium text-balance sm:text-[42px]";
const wrap = "mx-auto w-full max-w-[1200px] px-5 sm:px-10";

function Section({
  id,
  labelledBy,
  className = "",
  children,
}: {
  id?: string;
  labelledBy: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`scroll-mt-20 py-16 sm:py-24 ${className}`}>
      <div className={wrap}>{children}</div>
    </section>
  );
}

/** A headline in two lines, the second in the primary colour. */
function Title({ id, lines, className = "" }: { id: string; lines: readonly [string, string] | readonly string[]; className?: string }) {
  return (
    <h2 id={id} className={`${h2} ${className}`}>
      {lines[0]}
      <br className="hidden sm:inline" /> <span className="text-primary">{lines[1]}</span>
    </h2>
  );
}

export async function Landing() {
  const [locale, m] = await Promise.all([getLocale(), getMessages()]);
  const t = m.landing;
  const c = m.common;
  const beta = isBetaMode();
  // The last question is about the trial; during the beta it is about what happens when the beta ends.
  const faqItems = beta ? [...t.faq.items.slice(0, -1), t.beta.faqAfter] : t.faq.items;
  const card = t.request.card;
  const al = t.allowances.card;
  const br = t.holidays.bridge;
  const up = t.updates;
  const nav = [
    { href: "#for-whom", label: c.productNav.forWhom },
    { href: "#features", label: c.productNav.features },
    { href: "#pricing", label: c.productNav.pricing },
    { href: "#faq", label: c.productNav.faq },
  ];
  return (
    <div className="landing text-foreground">
      {/* ---------- Nav ---------- */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className={`${wrap} flex h-[72px] items-center justify-between gap-4 sm:h-[88px]`}>
          <Link href="/" aria-label={c.appName} className="flex min-h-11 items-center gap-2.5 text-lg font-semibold">
            <LogoMark className="size-9" />
            {c.appName}
          </Link>
          <nav aria-label={c.productNav.label} className="hidden items-center gap-8 text-sm text-muted lg:flex [&_a:hover]:text-foreground">
            {nav.map((n) => (
              <a key={n.href} href={n.href}>
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSwitch locale={locale} />
            <Link href="/sign-in" className="btn min-h-10 rounded-[10px] px-4 py-1.5 text-sm">
              {t.nav.signIn}
            </Link>
          </div>
        </div>
      </header>

      <div>
        {/* ---------- Hero ---------- */}
        <section aria-labelledby="hero-title" className="py-12 sm:py-20">
          <div className={`${wrap} grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16`}>
            <div className="space-y-7">
              <p className={eyebrow}>{t.hero.eyebrow}</p>
              <h1 id="hero-title" className="text-[40px] leading-[1.05] font-medium text-balance sm:text-6xl">
                {t.hero.titleLead} <span className="text-primary">{t.hero.titleAccent}</span>
              </h1>
              <p className="max-w-xl text-lg text-muted">{t.hero.body}</p>
              <p className="max-w-xl text-sm font-medium">{t.hero.audience}</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/sign-in" className="btn min-h-[50px] gap-3 rounded-[10px] px-6 text-base">
                  {beta ? t.beta.heroCta : t.hero.cta(TRIAL_DAYS)}
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
                <a href="#pricing" className="btn-secondary min-h-[50px] rounded-[10px] px-6 text-base">
                  {t.hero.pricing}
                </a>
              </div>
              <ul className="space-y-1 text-sm text-muted">
                <li>{beta ? t.hero.terms : t.hero.setup}</li>
                {beta && <li>{t.hero.setup}</li>}
              </ul>
              <p className="text-sm text-muted">{t.hero.invite}</p>
            </div>
            <HeroCalendar locale={locale} />
          </div>
        </section>

        {/* ---------- Trust ---------- */}
        <div className="border-y border-border bg-surface">
          <ul aria-label={t.trust.label} className={`${wrap} grid gap-x-8 gap-y-3 py-6 text-sm sm:grid-cols-2 lg:grid-cols-4`}>
            {t.trust.items.map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <Check aria-hidden className="size-4 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* ---------- Who it's for ---------- */}
        <Section id="for-whom" labelledBy="audiences-title" className="bg-surface">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-4">
              <p className={eyebrow}>{t.audiences.eyebrow}</p>
              <h2 id="audiences-title" className={h2}>
                {t.audiences.title}
              </h2>
            </div>
            <div className="space-y-4 lg:pt-8">
              <p className="text-lg text-muted">{t.audiences.body}</p>
              <p className="font-medium">{t.audiences.note}</p>
            </div>
          </div>
          <ul id="features" className="mt-12 grid scroll-mt-24 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {t.audiences.items.map((a) => (
              <li key={a.title} className="space-y-2 border-t-2 border-foreground pt-4">
                <h3 className="text-lg font-semibold">{a.title}</h3>
                <p className="text-sm text-muted">{a.body}</p>
              </li>
            ))}
          </ul>
        </Section>

        {/* ---------- Request flow ---------- */}
        <Section labelledBy="request-title">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-8">
              <div className="space-y-4">
                <p className={eyebrow}>{t.request.eyebrow}</p>
                <Title id="request-title" lines={t.request.title} />
              </div>
              <ol className="space-y-6">
                {t.request.steps.map((s, i) => (
                  <li key={s.title} className="flex gap-4">
                    <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary-ink">
                      {i + 1}
                    </span>
                    <div className="space-y-1">
                      <h3 className="font-semibold">{s.title}</h3>
                      <p className="text-sm text-muted">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <figure className="space-y-3">
              <div className="space-y-5 rounded-[18px] border border-border bg-surface p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{card.title}</span>
                  <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning">{card.pending}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span aria-hidden className="grid size-11 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary-ink">
                    AB
                  </span>
                  <div>
                    <div className="font-semibold">{card.name}</div>
                    <div className="text-sm text-muted">{card.role}</div>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-4 rounded-[12px] bg-surface-muted p-4">
                  <div>
                    <dt className="text-[11px] font-semibold tracking-wide text-muted uppercase">{card.type}</dt>
                    <dd className="mt-1 text-sm font-medium">{card.date}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold tracking-wide text-muted uppercase">{card.duration}</dt>
                    <dd className="mt-1 text-sm font-medium">{card.oneDay}</dd>
                  </div>
                </dl>
                <div className="rounded-[12px] border border-warning/30 bg-warning-soft p-4 text-sm">
                  <div className="font-semibold text-warning">{card.warningTitle}</div>
                  <p className="mt-1">{card.warning}</p>
                </div>
                <div aria-hidden className="grid grid-cols-2 gap-3">
                  <span className="btn-secondary min-h-11 justify-center rounded-[10px]">{card.decline}</span>
                  <span className="btn min-h-11 justify-center rounded-[10px]">{card.approve}</span>
                </div>
              </div>
              <figcaption className="text-xs text-muted">{card.note}</figcaption>
            </figure>
          </div>
        </Section>

        {/* ---------- Allowances ---------- */}
        <Section labelledBy="allowances-title" className="bg-primary-soft">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-6">
              <p className={eyebrow}>{t.allowances.eyebrow}</p>
              <Title id="allowances-title" lines={t.allowances.title} />
              <p className="max-w-xl text-lg text-muted">{t.allowances.body}</p>
              <div className="max-w-xl space-y-1 border-t-2 border-foreground pt-4">
                <h3 className="font-semibold">{t.allowances.halfTitle}</h3>
                <p className="text-sm text-muted">{t.allowances.halfBody}</p>
              </div>
            </div>
            <figure className="space-y-3">
              <div className="space-y-6 rounded-[18px] border border-border bg-surface p-6">
                <div className="flex items-center justify-between text-[11px] font-semibold tracking-wide text-muted uppercase">
                  <span>{al.heading}</span>
                  <span className="font-normal normal-case">{al.illustrative}</span>
                </div>
                <div className="flex items-end gap-3">
                  <span className="text-[88px] leading-none font-medium tabular-nums">15</span>
                  <span className="pb-2 text-lg text-muted">{al.left}</span>
                </div>
                <div aria-hidden className="flex h-3 overflow-hidden rounded-full bg-surface-muted">
                  <div className="bg-success" style={{ width: "40%" }} />
                  <div className="pending-stripes bg-warning" style={{ width: "10%" }} />
                </div>
                <dl className="grid grid-cols-4 gap-2 text-sm">
                  {[
                    ["30", al.allowance],
                    ["12", al.taken],
                    ["3", al.pending],
                    ["15", al.remaining],
                  ].map(([n, label]) => (
                    <div key={label}>
                      <dd className="text-xl font-semibold tabular-nums">{n}</dd>
                      <dt className="text-xs text-muted">{label}</dt>
                    </div>
                  ))}
                </dl>
                <div aria-hidden className="flex items-center justify-between gap-3 rounded-[12px] bg-surface-muted p-3 text-sm">
                  <span className="font-medium">{al.bookHalf}</span>
                  <span className="flex rounded-full border border-border bg-surface p-0.5 text-xs font-medium">
                    <span className="rounded-full bg-primary px-3 py-1 text-primary-foreground">{al.morning}</span>
                    <span className="px-3 py-1 text-muted">{al.afternoon}</span>
                  </span>
                </div>
              </div>
            </figure>
          </div>
        </Section>

        {/* ---------- Holidays ---------- */}
        <Section labelledBy="holidays-title" className="bg-surface">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-4">
              <p className={eyebrow}>{t.holidays.eyebrow}</p>
              <Title id="holidays-title" lines={t.holidays.title} />
            </div>
            <p className="text-lg text-muted lg:pt-8">{t.holidays.body}</p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <figure className="space-y-5 rounded-[18px] border border-border bg-background p-6">
              <div className="flex items-center justify-between text-[11px] font-semibold tracking-wide text-muted uppercase">
                <span>{br.heading}</span>
                <span className="font-normal normal-case">{br.month}</span>
              </div>
              <ol aria-label={br.label} className="grid grid-cols-4 gap-2">
                {br.days.map((d, i) => (
                  <li
                    key={d.day}
                    className={`rounded-[12px] p-3 text-center ${
                      i === 1 ? "bg-primary text-primary-foreground" : i === 0 ? "bg-danger-soft" : "bg-surface-muted"
                    }`}
                  >
                    <div className={`text-xs ${i === 1 ? "" : "text-muted"}`}>{d.day}</div>
                    <div className="text-xl font-semibold">{d.n}</div>
                    <div className="mt-1 text-[11px] leading-tight">{d.note}</div>
                  </li>
                ))}
              </ol>
              <figcaption className="space-y-1">
                <div className="text-xl font-semibold">{br.result}</div>
                <p className="text-sm text-muted">{br.note}</p>
              </figcaption>
            </figure>
            <figure className="space-y-4 rounded-[18px] border border-border bg-background p-6">
              <dl className="divide-y divide-border">
                {t.holidays.regions.map((r) => (
                  <div key={r.name} className="space-y-1 py-4 first:pt-0">
                    <dt className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold">{r.name}</span>
                      <span className="text-sm font-medium text-primary-ink">{r.count}</span>
                    </dt>
                    <dd className="text-sm text-muted">{r.detail}</dd>
                  </div>
                ))}
              </dl>
              <figcaption className="text-xs text-muted">{t.holidays.regionNote}</figcaption>
            </figure>
          </div>
        </Section>

        {/* ---------- Updates ---------- */}
        <Section labelledBy="updates-title" className="bg-[#20363e] text-[#cedfe2]">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-6">
              <p className="text-[11px] font-semibold tracking-wide text-accent uppercase">{up.eyebrow}</p>
              <h2 id="updates-title" className={`${h2} text-white`}>
                {up.title[0]}
                <br className="hidden sm:inline" /> {up.title[1]}
              </h2>
              <p className="max-w-xl text-lg">{up.body}</p>
              <div className="max-w-xl space-y-1 border-t border-white/25 pt-4">
                <h3 className="font-semibold text-white">{up.feedTitle}</h3>
                <p className="text-sm">{up.feedBody}</p>
              </div>
            </div>
            <figure className="rounded-[18px] bg-white/[0.06] p-5 ring-1 ring-white/15">
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="font-semibold text-white">{up.channel}</span>
                <span className="text-[11px] font-semibold tracking-wide uppercase">{up.example}</span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="rounded-[12px] bg-white/10 p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{up.daily.source}</span>
                    <span className="text-xs">{up.daily.time}</span>
                  </div>
                  <div className="mt-1 font-medium text-white">{up.daily.title}</div>
                  <ul className="mt-1">
                    {up.daily.lines.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[12px] bg-white/10 p-4">
                  <div className="font-semibold text-white">{up.daily.source}</div>
                  {up.booking.lines.map((l, i) => (
                    <p key={l} className={i === 0 ? "mt-1 font-medium text-white" : ""}>
                      {l}
                    </p>
                  ))}
                  <p className="mt-2 font-medium text-white underline">{up.booking.link}</p>
                </div>
              </div>
            </figure>
          </div>
          <ul className="mt-12 grid gap-3 border-t border-white/20 pt-6 text-sm sm:grid-cols-3">
            {up.principles.map((p) => (
              <li key={p} className="flex items-center gap-2.5">
                <Check aria-hidden className="size-4 shrink-0 text-accent" />
                {p}
              </li>
            ))}
          </ul>
        </Section>

        {/* ---------- Getting started ---------- */}
        <Section labelledBy="how-title">
          <div className="space-y-4">
            <p className={eyebrow}>{t.steps.eyebrow}</p>
            <h2 id="how-title" className={h2}>
              {t.steps.title}
            </h2>
          </div>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {t.steps.items.map((s, i) => (
              <li key={s.title} className="space-y-2 border-t-2 border-foreground pt-4">
                <span aria-hidden className="text-4xl font-medium text-primary">
                  {i + 1}
                </span>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* ---------- Pricing ---------- */}
        <Section id="pricing" labelledBy="pricing-title" className="bg-surface">
          {beta ? (
            <BetaPricing locale={locale} />
          ) : (
            <div className="space-y-10">
              <div className="max-w-2xl space-y-3">
                <h2 id="pricing-title" className={h2}>
                  {t.pricing.title}
                </h2>
                <p className="text-lg text-muted">{t.pricing.subtitle(TRIAL_DAYS)}</p>
              </div>
              <PricePicker contactEmail={OPERATOR.email} />
              <p className="text-sm text-muted">{t.pricing.footnote(PLANS.BUSINESS.maxMembers)}</p>
            </div>
          )}
        </Section>

        {/* ---------- FAQ ---------- */}
        <Section id="faq" labelledBy="faq-title">
          <div className="grid gap-10 lg:grid-cols-[350px_1fr] lg:gap-16">
            <h2 id="faq-title" className={h2}>
              {t.faq.title}
            </h2>
            <div className="divide-y divide-border border-y border-border">
              {faqItems.map((f, i) => (
                <details key={f.q} open={i < 3} className="group py-5">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span aria-hidden className="shrink-0 text-primary">
                      <Plus className="size-5 group-open:hidden" />
                      <Minus className="hidden size-5 group-open:block" />
                    </span>
                  </summary>
                  <p className="mt-2 max-w-2xl pr-10 text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </Section>

        {/* ---------- Closing ---------- */}
        <Section labelledBy="cta-title" className="bg-primary-soft">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto] lg:gap-16">
            <div className="space-y-4">
              <p className={eyebrow}>{t.cta.eyebrow}</p>
              <Title id="cta-title" lines={t.cta.title} />
              <p className="max-w-xl text-lg text-muted">{t.cta.body}</p>
            </div>
            <div className="space-y-3 lg:w-[270px]">
              <Link href="/sign-in" className="btn min-h-[56px] w-full gap-3 rounded-[10px] text-base">
                {t.cta.button}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
              {beta && <p className="text-center text-xs text-muted">{t.cta.note}</p>}
            </div>
          </div>
        </Section>
      </div>

      {/* ---------- Footer ---------- */}
      <footer className="bg-surface">
        <div className={`${wrap} grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:gap-16`}>
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-lg font-semibold">
              <LogoMark className="size-9" />
              {c.appName}
            </div>
            <p className="max-w-xs text-sm text-muted">{t.footer.tagline}</p>
            <LanguageSwitch locale={locale} />
          </div>
          <nav aria-label={c.productNav.label} className="flex flex-col text-sm text-muted [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a:hover]:text-foreground [&_a:hover]:underline">
            {nav.map((n) => (
              <a key={n.href} href={n.href}>
                {n.label}
              </a>
            ))}
          </nav>
          <nav aria-label={c.legalNav} className="flex flex-col text-sm text-muted [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a:hover]:text-foreground [&_a:hover]:underline">
            <Link href="/impressum">{c.footer.impressum}</Link>
            <Link href="/datenschutz">{c.footer.privacy}</Link>
            <Link href="/agb">{c.footer.terms}</Link>
            <Link href="/avv">{c.footer.dpa}</Link>
          </nav>
        </div>
        {beta && (
          <div className="border-t border-border">
            <p className={`${wrap} py-4 text-xs text-muted`}>{c.footer.beta}</p>
          </div>
        )}
      </footer>
    </div>
  );
}
