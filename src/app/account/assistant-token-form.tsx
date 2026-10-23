"use client";

import { useActionState } from "react";
import { submitKeepingInput } from "@/components/action-form";
import { CopyField } from "@/components/copy-field";
import { useI18n } from "@/components/i18n-provider";
import { TOKEN_DAYS } from "@/lib/personal-tokens-shared";
import { createAssistantTokenAction, type TokenResult } from "./actions";

/** Creates a personal token (#45) and shows it once, with the lines to paste into the assistant. */
export function AssistantTokenForm({ workspaces, endpoint }: { workspaces: { membershipId: string; name: string }[]; endpoint: string }) {
  const [state, formAction, pending] = useActionState<TokenResult, FormData>(createAssistantTokenAction, {});
  const t = useI18n().t.assistant;

  if (state.token) {
    const header = `Authorization: Bearer ${state.token}`;
    const vscode = JSON.stringify({ servers: { urlaubflow: { type: "http", url: endpoint, headers: { Authorization: `Bearer ${state.token}` } } } });
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">{t.created}</p>
        <CopyField value={state.token} />
        <h3 className="pt-2 text-sm font-medium">{t.setup}</h3>
        <p className="text-sm text-muted">{t.claudeCode}</p>
        <CopyField value={`claude mcp add --transport http urlaubflow ${endpoint} --header "${header}"`} />
        <p className="text-sm text-muted">{t.vscode}</p>
        <CopyField value={vscode} />
        <p className="text-sm text-muted">{t.other(endpoint)}</p>
      </div>
    );
  }

  return (
    <form className="space-y-3" onSubmit={(e) => submitKeepingInput(e, formAction)}>
      <fieldset disabled={pending} className="contents">
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t.name}</span>
          <input name="name" className="input" required minLength={2} maxLength={40} placeholder={t.namePlaceholder} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {workspaces.length > 1 ? (
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t.workspace}</span>
              <select name="membershipId" className="input">
                {workspaces.map((w) => (
                  <option key={w.membershipId} value={w.membershipId}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <input type="hidden" name="membershipId" value={workspaces[0]?.membershipId ?? ""} />
          )}
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t.validFor}</span>
            <select name="days" className="input" defaultValue="90">
              {TOKEN_DAYS.map((d) => (
                <option key={d} value={d}>
                  {t.days(d)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="btn">{pending ? t.creating : t.create}</button>
      </fieldset>
      <div aria-live="polite" role="status">
        {state.error && <p className="mt-1 text-sm text-danger">{state.error}</p>}
      </div>
    </form>
  );
}
