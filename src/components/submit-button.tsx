"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** Submit button that shows it's working while the form's server action runs. */
export function SubmitButton({ children, pending: pendingLabel, className = "btn" }: { children: ReactNode; pending: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
