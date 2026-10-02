"use client";

import { useActionState, useEffect, useState } from "react";
import { createWorkspaceAction } from "./actions";

export function NewWorkspaceForm({ timezones }: { timezones: string[] }) {
  const [state, action, pending] = useActionState(createWorkspaceAction, {});
  const [timezone, setTimezone] = useState("UTC");

  // Default to the browser's timezone; only known after hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  return (
    <form action={action} className="max-w-md space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium">Name</span>
        <input className="input" name="name" required minLength={2} maxLength={60} placeholder="Acme Engineering" />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Timezone</span>
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
        {pending ? "Creating…" : "Create workspace"}
      </button>
    </form>
  );
}
