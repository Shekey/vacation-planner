import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { FOUNDER_DISCOUNT_PERCENT, founderPrice } from "@/lib/beta";
import type { Locale } from "@/lib/i18n";
import { intlLocale, messagesFor } from "@/lib/i18n";
import { PLANS } from "@/lib/plans";

/**
 * Pricing while the free beta runs: free access now, the regular prices in the open, and the founder discount
 * for teams that join now. Shown instead of the price picker while isBetaMode() is true. Server component.
 */
export function BetaPricing({ locale }: { locale: Locale }) {
  const t = messagesFor(locale).landing.beta;
  const euro = (n: number) =>
    new Intl.NumberFormat(intlLocale(locale), {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(n);
  const later = [
    { name: t.later.team, people: PLANS.TEAM.maxMembers, price: PLANS.TEAM.monthly },
    { name: t.later.business, people: PLANS.BUSINESS.maxMembers, price: PLANS.BUSINESS.monthly },
  ];

  return (
    <div className="space-y-12">
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-16">
        <div className="space-y-4">
          <p className="text-[11px] font-semibold tracking-wide text-primary-ink uppercase">{t.eyebrow}</p>
          <h2 id="pricing-title" className="text-[30px] leading-[1.14] font-medium sm:text-[42px]">
            {t.title[0]} <span className="block">{t.title[1]}</span>
          </h2>
        </div>
        <p className="self-center text-base leading-[1.55] text-muted">{t.subtitle}</p>
      </div>

      <div className="grid items-center gap-10 lg:grid-cols-[440px_minmax(0,1fr)] lg:gap-16">
        <div className="space-y-6 rounded-2xl border border-primary bg-background p-6 sm:p-8">
          <p className="text-[11px] font-semibold text-primary-ink">{t.now.available}</p>
          <p className="text-2xl">{t.now.name}</p>
          <p className="flex items-baseline gap-2.5">
            <span className="text-6xl leading-none font-medium">{euro(0)}</span>
            <span className="text-sm text-muted">{t.now.perMonth}</span>
          </p>
          <ul className="space-y-3 text-sm">
            {t.now.features.map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <Check aria-hidden className="size-4 shrink-0 text-success" strokeWidth={2.5} /> {f}
              </li>
            ))}
          </ul>
          <Link href="/sign-in" className="btn min-h-[50px] w-full gap-3.5 rounded-[10px] text-sm">
            {t.now.cta} <ArrowRight aria-hidden className="size-[18px]" />
          </Link>
          <p className="text-center text-[11px] text-muted">{t.now.note}</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted">{t.later.eyebrow}</p>
            <p className="text-[21px] font-medium">{t.later.title}</p>
          </div>
          <ul className="divide-y divide-border border-y border-border">
            {later.map((p) => (
              <li key={p.name} className="flex items-center justify-between gap-4 py-5">
                <div className="space-y-1.5">
                  <p className="text-xl font-medium">{p.name}</p>
                  <p className="text-[13px] text-muted">{t.later.upTo(p.people)}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[30px] leading-none font-medium">{euro(p.price)}</p>
                  <p className="text-[11px] text-muted">{t.later.flat}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="space-y-2 rounded-[10px] bg-primary-soft p-5 text-primary-ink">
            <p className="text-base font-semibold">{t.founder.title(FOUNDER_DISCOUNT_PERCENT)}</p>
            <p className="text-[13px] leading-[1.55]">{t.founder.body(FOUNDER_DISCOUNT_PERCENT, euro(founderPrice(PLANS.TEAM.monthly)))}</p>
          </div>
          <p className="text-[13px] leading-[1.55] text-muted">{t.footnote}</p>
        </div>
      </div>

      <div className="space-y-2 border-t border-border pt-6">
        <p className="text-[15px] font-medium">{t.control.title}</p>
        <p className="text-[13px] leading-[1.55] text-muted">{t.control.body}</p>
      </div>
    </div>
  );
}
