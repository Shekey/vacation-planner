import { Check, Clock3 } from "lucide-react";
import { Avatar } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import type { Locale } from "@/lib/i18n";
import { messagesFor } from "@/lib/i18n";

/** Monday 9 to Sunday 15 November 2026: the example week from the design. */
const DAYS = ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"];
const SELECTED = 1;
const IN = ["5", "4", "5", "5", "5", "—", "—"];

type Row = { name: string; role: "dentist" | "assistant" | "reception"; pill?: { start: number; days: number; status: "approved" | "pending" } };
const ROWS: Row[] = [
  { name: "Anna Becker", role: "dentist", pill: { start: 1, days: 1, status: "pending" } },
  { name: "Ben Hoffmann", role: "dentist" },
  { name: "Lea Fischer", role: "assistant", pill: { start: 0, days: 3, status: "approved" } },
  { name: "Nina Keller", role: "assistant", pill: { start: 3, days: 2, status: "approved" } },
  { name: "Emil Braun", role: "assistant" },
  { name: "Tom Weber", role: "reception", pill: { start: 1, days: 1, status: "approved" } },
];

const cols = "grid-cols-[minmax(0,2.5fr)_repeat(7,minmax(0,1fr))]";

/**
 * A static picture of the team calendar for the landing page: the same view as in the app, with example people.
 * Not live data, so the whole thing is one labelled figure.
 */
export function HeroCalendar({ locale }: { locale: Locale }) {
  const t = messagesFor(locale).landing.preview;
  const unit = locale === "de" ? "T" : "d";
  const weekend = (i: number) => i >= 5;
  const bg = (i: number) => (i === SELECTED ? "bg-primary-soft" : weekend(i) ? "bg-surface-muted" : "");
  return (
    <figure role="img" aria-label={t.label} className="space-y-3">
      <div aria-hidden className="overflow-hidden rounded-[18px] border border-border bg-surface">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="grid size-9 place-items-center rounded-[10px] bg-primary-soft text-[11px] font-semibold text-primary-ink">DP</span>
          <span className="text-sm font-semibold">{t.team}</span>
          <span className="ml-auto text-xs text-muted">{t.people(6)}</span>
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-2xl sm:text-[28px]">{t.title}</p>
            <p className="text-xs text-primary-ink">
              {t.month} / {t.week}
            </p>
          </div>
          <p className="text-[15px] font-semibold">{formatDate("2026-11-09", { month: "long", year: "numeric" }, locale)}</p>

          <div className="text-[11px]">
            <div className={`grid ${cols} items-end`}>
              <p className="pb-2 text-[10px] tracking-wide text-muted">{t.peopleHeading(6)}</p>
              {DAYS.map((d, i) => (
                <div
                  key={d}
                  className={`flex flex-col items-center gap-0.5 rounded-t-md py-2 ${
                    i === SELECTED ? "bg-primary text-primary-foreground" : weekend(i) ? "bg-surface-muted" : ""
                  }`}
                >
                  <span className={`text-[10px] ${i === SELECTED ? "" : "text-muted"}`}>{formatDate(d, { weekday: "short" }, locale)}</span>
                  <span className="text-base font-semibold">{Number(d.slice(8))}</span>
                </div>
              ))}
            </div>
            <div className={`grid ${cols} items-center border-y border-border`}>
              <p className="py-2.5 text-[11px] font-semibold">{t.peopleIn}</p>
              {IN.map((n, i) => (
                <p key={i} className={`py-2.5 text-center text-xs ${bg(i)} ${i === SELECTED ? "text-primary-ink" : "text-muted"}`}>
                  {n}
                </p>
              ))}
            </div>
            {ROWS.map((r) => (
              <div key={r.name} className={`grid ${cols} items-stretch border-b border-border`}>
                <div className="flex min-w-0 items-center gap-2 py-2.5 pr-2" style={{ gridColumn: 1, gridRow: 1 }}>
                  <Avatar label={r.name} className="size-7 text-[10px]" />
                  <div className="hidden min-w-0 sm:block">
                    <p className="truncate text-xs font-semibold sm:text-[13px]">{r.name}</p>
                    <p className="truncate text-[10px] text-muted">{t.roles[r.role]}</p>
                  </div>
                </div>
                {DAYS.map((d, i) => (
                  <div key={d} className={`min-h-12 border-l border-border ${bg(i)}`} style={{ gridColumn: i + 2, gridRow: 1 }} />
                ))}
                {r.pill && (
                  <div
                    className={`z-[1] m-1.5 flex min-w-0 items-center justify-center gap-1 self-center overflow-hidden rounded-md border px-1.5 py-1.5 text-[10px] font-semibold sm:px-2 sm:text-[11px] ${
                      r.pill.status === "pending"
                        ? "border-dashed border-warning/50 bg-warning-soft text-warning"
                        : "border-success bg-success-soft text-success"
                    }`}
                    style={{ gridColumn: `${r.pill.start + 2} / span ${r.pill.days}`, gridRow: 1 }}
                  >
                    {r.pill.status === "pending" ? <Clock3 className="size-3 shrink-0" strokeWidth={2.5} /> : <Check className="size-3 shrink-0" strokeWidth={2.5} />}
                    {r.pill.days > 1 && (
                      <span className="truncate">
                        {r.pill.days}
                        {unit}
                        {r.pill.days > 2 && ` · ${t.approved}`}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1 text-success">
              <Check className="size-3" strokeWidth={2.5} /> {t.approved}
            </span>
            <span className="inline-flex items-center gap-1 text-warning">
              <Clock3 className="size-3" strokeWidth={2.5} /> {t.pending}
            </span>
            <span>— {t.nonWorking}</span>
          </div>
          <div className="space-y-1 rounded-[10px] bg-warning-soft p-4 text-warning">
            <p className="text-[13px] font-semibold">{t.warningTitle}</p>
            <p className="text-xs">{t.warning}</p>
          </div>
        </div>
      </div>
      <figcaption className="text-[11px] text-muted">{t.caption}</figcaption>
    </figure>
  );
}
