"use client";

import { useActionState, useEffect, useState } from "react";
import { submitKeepingInput } from "@/components/action-form";
import { useI18n } from "@/components/i18n-provider";
import { regionsOf } from "@/lib/holiday-regions";
import { TRIAL_DAYS } from "@/lib/plans";
import { TEAM_TYPE_KEYS, TEAM_TYPES, type TeamType } from "@/lib/team-types";
import { createWorkspaceAction } from "./actions";

/** Three short steps on one page: what the team is, its vacation days, where it works. */
export function NewWorkspaceForm({
  timezones,
  countries,
}: {
  timezones: string[];
  /** Named on the server, so the names match what was rendered there. */
  countries: { code: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createWorkspaceAction, {});
  const { locale, t: messages } = useI18n();
  const t = messages.newWorkspace;
  const [timezone, setTimezone] = useState("UTC");
  const [teamType, setTeamType] = useState<TeamType>("office");
  const [allowance, setAllowance] = useState<string>(String(TEAM_TYPES.office.allowance));
  const [country, setCountry] = useState("DE");
  const regions = country ? regionsOf(country, locale) : [];

  // Default to the browser's timezone; only known after hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  function pickType(type: TeamType) {
    setTeamType(type);
    setAllowance(String(TEAM_TYPES[type].allowance));
  }

  return (
    <form onSubmit={(e) => submitKeepingInput(e, action)} className="max-w-2xl space-y-8">
      <Step n={1} title={t.step1}>
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t.name}</span>
          <input className="input" name="name" required minLength={2} maxLength={60} placeholder={t.namePlaceholder} />
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t.teamType}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {TEAM_TYPE_KEYS.map((key) => (
              <label
                key={key}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface p-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary"
              >
                <input
                  type="radio"
                  name="teamType"
                  value={key}
                  checked={teamType === key}
                  onChange={() => pickType(key)}
                  className="sr-only"
                />
                <span aria-hidden className="text-xl leading-none">
                  {TEAM_TYPES[key].icon}
                </span>
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">{t.types[key].label}</span>
                  <span className="block text-xs text-muted">{t.types[key].hint}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted">{TEAM_TYPES[teamType].approvals ? t.approvalsOn : t.approvalsOff}</p>
        </fieldset>
      </Step>

      <Step n={2} title={t.step2}>
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t.allowance}</span>
          <div className="flex items-center gap-2">
            <input
              className="input w-24"
              name="allowance"
              type="number"
              min={0}
              max={365}
              step={0.5}
              required
              value={allowance}
              onChange={(e) => setAllowance(e.target.value)}
            />
            <span className="text-sm text-muted">{t.daysPerYear}</span>
          </div>
          <span className="block text-xs text-muted">{t.allowanceHint}</span>
        </label>
      </Step>

      <Step n={3} title={t.step3}>
        <div className="flex flex-wrap gap-3">
          <label className="space-y-1">
            <span className="block text-sm font-medium">{t.country}</span>
            <select name="country" className="input w-auto" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">{t.noHolidays}</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {regions.length > 0 && (
            <label className="space-y-1">
              <span className="block text-sm font-medium">{t.region}</span>
              <select key={country} name="region" className="input w-auto" defaultValue="">
                <option value="">{t.nationwideOnly}</option>
                {regions.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <p className="text-xs text-muted">{t.holidaysHint}</p>
        <label className="block space-y-1">
          <span className="block text-sm font-medium">{t.timezone}</span>
          <select className="input sm:w-auto" name="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </label>
      </Step>

      <div aria-live="polite" role="status">
        {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn px-5 py-2.5" disabled={pending}>
          {pending ? t.creating : t.create}
        </button>
        <span className="text-sm text-muted">{t.trialNote(TRIAL_DAYS)}</span>
      </div>
    </form>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-4">
      <h2 className="flex items-center gap-3 font-semibold">
        <span
          aria-hidden
          className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm text-primary-foreground"
        >
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
