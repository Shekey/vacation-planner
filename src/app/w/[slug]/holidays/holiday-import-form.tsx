"use client";

import { useMemo, useState } from "react";
import { ActionForm, type ActionResult } from "@/components/action-form";
import { useI18n } from "@/components/i18n-provider";
import { HOLIDAY_COUNTRIES, countryName, regionsOf } from "@/lib/holiday-regions";
import { intlLocale, type Locale } from "@/lib/i18n";

// Germany first, then the rest alphabetically by name.
function countriesIn(locale: Locale) {
  return [...HOLIDAY_COUNTRIES]
    .map((code) => ({ code, name: countryName(code, locale) }))
    .sort((a, b) => Number(b.code === "DE") - Number(a.code === "DE") || a.name.localeCompare(b.name, intlLocale(locale)));
}

export function HolidayImportForm(props: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  country: string;
  region: string;
  year: number;
}) {
  const { locale, t: messages } = useI18n();
  const t = messages.holidays;
  const countries = useMemo(() => countriesIn(locale), [locale]);
  const [country, setCountry] = useState(props.country || "DE");
  const regions = regionsOf(country, locale);

  return (
    <ActionForm action={props.action} className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="block text-sm">{t.country}</span>
          <select name="country" className="input w-auto" value={country} onChange={(e) => setCountry(e.target.value)}>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-sm">{t.year}</span>
          <input name="year" type="number" className="input w-24" defaultValue={props.year} min={2000} max={2100} required />
        </label>
      </div>
      {regions.length > 0 && (
        <label className="block space-y-1">
          <span className="block text-sm">{t.mainRegion}</span>
          <select key={country} name="region" className="input w-auto" defaultValue={country === props.country ? props.region : ""}>
            <option value="">{t.nationwideOnly}</option>
            {regions.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
          <span className="block text-xs opacity-60">{t.mainRegionHint}</span>
        </label>
      )}
      <button className="btn">{t.import}</button>
    </ActionForm>
  );
}
