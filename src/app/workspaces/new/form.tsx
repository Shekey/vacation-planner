"use client";

import { useActionState, useEffect, useState } from "react";
import { submitKeepingInput } from "@/components/action-form";
import { useI18n } from "@/components/i18n-provider";
import { createWorkspaceAction } from "./actions";

export function NewWorkspaceForm({ timezones }: { timezones: string[] }) {
  const [state, action, pending] = useActionState(createWorkspaceAction, {});
  const t = useI18n().t.newWorkspace;
  const [timezone, setTimezone] = useState("UTC");

  // Default to the browser's timezone; only known after hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  return (
    <form onSubmit={(e) => submitKeepingInput(e, action)} className="max-w-md space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium">{t.name}</span>
        <input className="input" name="name" required minLength={2} maxLength={60} placeholder={t.namePlaceholder} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">{t.timezone}</span>
        <select className="input" name="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn" disabled={pending}>
        {pending ? t.creating : t.create}
      </button>
    </form>
  );
}
