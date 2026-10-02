"use client";

import { useActionState, type ReactNode } from "react";

export type ActionResult = { error?: string; ok?: string };
type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/** A form bound to a server action that shows its error or success message inline. */
export function ActionForm({
  action,
  children,
  className,
  confirm,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  /** Asks the browser to confirm before submitting. */
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {state.error && <p className="mt-1 text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="mt-1 text-sm text-green-700 dark:text-green-400">{state.ok}</p>}
    </form>
  );
}
