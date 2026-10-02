"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from "react";

export type ActionResult = { error?: string; ok?: string };
type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/**
 * Submits through a form action without React's automatic form reset,
 * so a validation error doesn't wipe what the person typed.
 */
export function submitKeepingInput(e: FormEvent<HTMLFormElement>, formAction: (fd: FormData) => void) {
  e.preventDefault();
  const submitter = (e.nativeEvent as SubmitEvent).submitter;
  const formData = new FormData(e.currentTarget, submitter);
  startTransition(() => formAction(formData));
}

/** A form bound to a server action that shows its error or success message inline. */
export function ActionForm({
  action,
  children,
  className,
  confirm,
  resetOnSuccess,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  /** Asks the browser to confirm before submitting. */
  confirm?: string;
  /** Clears the inputs after a successful submit, e.g. for invite forms. */
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.ok) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) {
          e.preventDefault();
          return;
        }
        submitKeepingInput(e, formAction);
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
