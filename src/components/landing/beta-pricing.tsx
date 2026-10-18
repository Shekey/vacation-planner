import Link from "next/link";
import { FOUNDER_DISCOUNT_PERCENT, founderPrice } from "@/lib/beta";
import type { Locale } from "@/lib/i18n";
import { intlLocale, messagesFor } from "@/lib/i18n";
import { PLANS } from "@/lib/plans";
import { icons } from "./icons";

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

  return (
    <div className="space-y-8">
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <p className="inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
          {t.badge}
        </p>
        <h2 id="pricing-title" className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t.title}
        </h2>
        <p className="text-lg text-muted">{t.subtitle}</p>
      </div>

      <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-2xl border border-foreground bg-surface p-6 shadow-lg">
          <h3 className="font-display text-lg font-semibold">{t.now.title}</h3>
          <p>
            <span className="text-4xl font-semibold tracking-tight">{euro(0)}</span>
            <span className="text-sm text-muted">{t.now.perMonth}</span>
          </p>
          <ul className="flex-1 space-y-2 text-sm">
            {t.now.features.map((f) => (
              <li key={f} className="flex gap-2">
                <icons.check className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" />
                {f}
              </li>
            ))}
          </ul>
          <Link href="/sign-in" className="btn w-full">
            {t.now.cta}
          </Link>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface/60 p-6">
          <h3 className="font-display text-lg font-semibold">{t.later.title}</h3>
          <ul className="space-y-3 text-sm">
            <li>{t.later.team(PLANS.TEAM.maxMembers, euro(PLANS.TEAM.monthly))}</li>
            <li>{t.later.business(PLANS.BUSINESS.maxMembers, euro(PLANS.BUSINESS.monthly))}</li>
          </ul>
          <p className="mt-auto rounded-xl border border-amber-400/60 bg-amber-50 p-4 text-sm font-medium text-balance dark:bg-amber-900/20">
            {t.founder(FOUNDER_DISCOUNT_PERCENT, euro(founderPrice(PLANS.TEAM.monthly)))}
          </p>
        </div>
      </div>
      <p className="text-center text-sm text-muted">{t.footnote}</p>
    </div>
  );
}
