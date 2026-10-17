"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { intlLocale } from "@/lib/i18n";
import { PLANS, planFor } from "@/lib/plans";
import { icons } from "./icons";

const KEYS = ["FREE", "TEAM", "BUSINESS"] as const;
const MAX = 100;

/** Drag to your team size; the plan that fits lights up. */
export function PricePicker({ contactEmail }: { contactEmail: string }) {
  const { locale, t: messages } = useI18n();
  const t = messages.landing.pricing;
  const [people, setPeople] = useState(12);
  const id = useId();
  const fit = planFor(people);
  const euro = (n: number, decimals = 0) =>
    new Intl.NumberFormat(intlLocale(locale), {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  const plan = fit ? PLANS[fit] : null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-7">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <label htmlFor={id} className="flex items-baseline justify-between gap-3 font-medium">
              {t.sizeLabel}
              <output htmlFor={id} className="font-display text-2xl font-semibold tabular-nums">
                {people >= MAX ? `${MAX}+` : people}
              </output>
            </label>
            <input
              id={id}
              type="range"
              min={1}
              max={MAX}
              value={people}
              onChange={(e) => setPeople(Number(e.target.value))}
              aria-valuetext={t.people(people)}
              className="w-full accent-sky-600"
            />
            <div className="relative h-4 text-xs text-muted" aria-hidden>
              {[PLANS.FREE.maxMembers, PLANS.TEAM.maxMembers, PLANS.BUSINESS.maxMembers, MAX].map((v, i, all) => (
                <span
                  key={v}
                  className={`absolute ${i === all.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
                  style={{ left: `${((v - 1) / (MAX - 1)) * 100}%` }}
                >
                  {v === MAX ? `${MAX}+` : v}
                </span>
              ))}
            </div>
          </div>
          <div aria-live="polite" className="min-w-56 md:border-l md:border-border md:pl-6">
            {plan ? (
              <div key={fit} className="pop-in space-y-1">
                <div className="text-sm text-muted">
                  {plan.name} · {t.fits}
                </div>
                <div>
                  <span className="font-display text-5xl font-semibold tracking-tight">{euro(plan.monthly)}</span>
                  <span className="text-sm text-muted">{t.perMonth}</span>
                </div>
                {plan.yearly > 0 && (
                  <div className="text-xs text-muted">
                    {t.orYearly(euro(plan.yearly))}
                    <br />
                    {t.perPerson(euro(plan.monthly / plan.maxMembers, 2))}
                  </div>
                )}
              </div>
            ) : (
              <div className="pop-in space-y-3">
                <p className="text-sm">{t.offer}</p>
                <a href={`mailto:${contactEmail}`} className="btn-secondary">
                  {t.contact}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {KEYS.map((key) => {
          const p = PLANS[key];
          const active = key === fit;
          return (
            <div
              key={key}
              className={`flex flex-col gap-4 rounded-2xl border p-5 transition-all duration-300 ${
                active ? "border-foreground bg-surface shadow-lg" : "border-border bg-surface/60"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-lg font-semibold">{p.name}</h3>
                <span className="text-sm text-muted">{t.upTo(p.maxMembers)}</span>
              </div>
              <p>
                <span className="text-3xl font-semibold tracking-tight">{euro(p.monthly)}</span>
                <span className="text-sm text-muted">{t.perMonth}</span>
              </p>
              <ul className="flex-1 space-y-2 text-sm">
                {t.features[key].map((f) => (
                  <li key={f} className="flex gap-2">
                    <icons.check className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/sign-in" className={active ? "btn w-full" : "btn-secondary w-full"}>
                {key === "FREE" ? t.startFree : t.start}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
