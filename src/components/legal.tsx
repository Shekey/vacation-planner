import type { ReactNode } from "react";
import { OPERATOR } from "@/lib/legal";

/** Frame for the German legal texts, with a draft notice until a lawyer has checked them. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article lang="de" className="legal mx-auto max-w-2xl space-y-4">
      {!OPERATOR.reviewed && (
        <p className="card border-amber-400/60 bg-amber-50 text-sm dark:bg-amber-900/20">
          Entwurf: Dieser Text ist noch nicht anwaltlich geprüft. / Draft: not yet reviewed by a lawyer.
        </p>
      )}
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted">Stand: {updated}</p>
      {children}
    </article>
  );
}

export function Operator() {
  return (
    <p>
      {OPERATOR.name}
      <br />
      {OPERATOR.address}
      <br />
      E-Mail: <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
      {OPERATOR.phone && (
        <>
          <br />
          Telefon: {OPERATOR.phone}
        </>
      )}
    </p>
  );
}
