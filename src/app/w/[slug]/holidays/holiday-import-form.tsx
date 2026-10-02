"use client";

import { useState } from "react";
import { ActionForm, type ActionResult } from "@/components/action-form";
import { HOLIDAY_COUNTRIES, HOLIDAY_REGIONS, countryName } from "@/lib/holiday-regions";

// Germany first, then the rest alphabetically by name.
const COUNTRIES = [...HOLIDAY_COUNTRIES]
  .map((code) => ({ code, name: countryName(code) }))
  .sort((a, b) => Number(b.code === "DE") - Number(a.code === "DE") || a.name.localeCompare(b.name));

export function HolidayImportForm(props: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  country: string;
  region: string;
  year: number;
}) {
  const [country, setCountry] = useState(props.country || "DE");
  const regions = HOLIDAY_REGIONS[country] ?? [];

  return (
    <ActionForm action={props.action} className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="block text-sm">Country</span>
          <select name="country" className="input w-auto" value={country} onChange={(e) => setCountry(e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-sm">Year</span>
          <input name="year" type="number" className="input w-24" defaultValue={props.year} min={2000} max={2100} required />
        </label>
      </div>
      {regions.length > 0 && (
        <label className="block space-y-1">
          <span className="block text-sm">Team&apos;s main region</span>
          <select
            key={country}
            name="region"
            className="input w-auto"
            defaultValue={country === props.country ? props.region : ""}
          >
            <option value="">Nationwide holidays only</option>
            {regions.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
          <span className="block text-xs opacity-60">
            Applies to everyone who hasn&apos;t picked their own region. People in other regions can choose theirs on this page.
          </span>
        </label>
      )}
      <button className="btn">Import</button>
    </ActionForm>
  );
}
