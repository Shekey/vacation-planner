import Link from "next/link";
import type { AllowanceSummary } from "@/lib/bookings";
import { formatDate } from "@/lib/dates";
import { formatNumber, messagesFor, type Locale } from "@/lib/i18n";

/** `editHref` is for admins: a link to where the allowance can be changed. */
export function AllowanceCard({ summary, editHref, locale }: { summary: AllowanceSummary; editHref?: string; locale: Locale }) {
  const { allowance, used, pending, remaining, year, carriedOver, carryOverExpiresOn, carryOverLeft, carryOverExpired } = summary;
  const t = messagesFor(locale).workspace.components.allowance;
  const fmt = (n: number) => formatNumber(n, locale);
  const deadline = carryOverExpiresOn ? formatDate(carryOverExpiresOn, { day: "numeric", month: "long" }, locale) : "";
  const pct = (n: number) => (allowance ? Math.min(100, (n / allowance) * 100) : 0);
  return (
    <section className="card space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-medium">{t.title(year)}</h2>
        {remaining !== null && (
          <span className={`text-sm ${remaining < 0 ? "text-red-600" : "opacity-70"}`}>{t.left(fmt(remaining), fmt(allowance!))}</span>
        )}
      </div>
      {allowance === null ? (
        <p className="text-sm opacity-70">
          {t.noAllowance(fmt(used), pending ? fmt(pending) : null)}
          {editHref && (
            <>
              {" "}
              <Link href={editHref} className="underline">
                {t.setAllowance}
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
            {t.taken(fmt(used), pending ? fmt(pending) : null)}
            {carriedOver > carryOverExpired && t.carriedOver(fmt(carriedOver - carryOverExpired), year - 1)}
            {carryOverLeft > 0 && t.carryOverLeft(fmt(carryOverLeft), deadline)}
            {carryOverExpired > 0 && t.carryOverExpired(fmt(carryOverExpired), carryOverExpired === 1, deadline)}
            {editHref && (
              <>
                {" · "}
                <Link href={editHref} className="underline">
                  {t.change}
                </Link>
              </>
            )}
          </p>
        </>
      )}
    </section>
  );
}
