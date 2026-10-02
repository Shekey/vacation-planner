import Link from "next/link";
import type { AllowanceSummary } from "@/lib/bookings";

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** `editHref` is for admins: a link to where the allowance can be changed. */
export function AllowanceCard({ summary, editHref }: { summary: AllowanceSummary; editHref?: string }) {
  const { allowance, used, pending, remaining, year, carriedOver } = summary;
  const pct = (n: number) => (allowance ? Math.min(100, (n / allowance) * 100) : 0);
  return (
    <section className="card space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-medium">Vacation in {year}</h2>
        {remaining !== null && (
          <span className={`text-sm ${remaining < 0 ? "text-red-600" : "opacity-70"}`}>
            {fmt(remaining)} of {fmt(allowance!)} days left
          </span>
        )}
      </div>
      {allowance === null ? (
        <p className="text-sm opacity-70">
          No yearly allowance is set for you. You&apos;ve taken {fmt(used)} days
          {pending ? ` and have ${fmt(pending)} pending` : ""}.
          {editHref && (
            <>
              {" "}
              <Link href={editHref} className="underline">
                Set your allowance
              </Link>
            </>
          )}
        </p>
      ) : (
        <>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/15" aria-hidden>
            <div className="bg-sky-500" style={{ width: `${pct(used)}%` }} />
            <div className="pending-stripes bg-sky-500/70" style={{ width: `${pct(pending)}%` }} />
          </div>
          <p className="text-sm opacity-70">
            {fmt(used)} taken{pending ? `, ${fmt(pending)} pending` : ""}
            {carriedOver > 0 && ` · includes ${fmt(carriedOver)} carried over from ${year - 1}`}
            {editHref && (
              <>
                {" · "}
                <Link href={editHref} className="underline">
                  Change
                </Link>
              </>
            )}
          </p>
        </>
      )}
    </section>
  );
}
