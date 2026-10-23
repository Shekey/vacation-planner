import { Check, X } from "lucide-react";
import { ActionForm, type ActionResult } from "@/components/action-form";
import type { Messages } from "@/lib/i18n";

/** Approve or decline, with an optional note that only goes into the email. `first` puts that button first. */
export function DecisionForm({
  action,
  t,
  first = "approve",
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  t: Messages["approvals"];
  first?: "approve" | "decline";
}) {
  const approve = (
    <button key="approve" name="decision" value="approve" className={`${first === "approve" ? "btn" : "btn-secondary text-primary-ink"} min-h-11 py-2`}>
      <Check aria-hidden className="size-4" /> {t.approve}
    </button>
  );
  const decline = (
    <button key="decline" name="decision" value="reject" className={`${first === "decline" ? "btn" : "btn-secondary text-primary-ink"} min-h-11 py-2`}>
      <X aria-hidden className="size-4" /> {t.decline}
    </button>
  );
  return (
    <ActionForm action={action} className="flex flex-wrap items-center gap-2">
      <input name="note" className="input min-w-48 flex-1 py-2 text-sm" placeholder={t.note} aria-label={t.note} />
      {first === "approve" ? [approve, decline] : [decline, approve]}
    </ActionForm>
  );
}
