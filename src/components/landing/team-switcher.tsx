"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n-provider";

/*
 * "Pick your kind of team": one tab per segment, each with a small calendar that shows the
 * feature that matters to them. Cells: v vacation, p requested, h public holiday,
 * x not a work day, b suggested bridge day, . working.
 */
type Scenario = {
  /**
   * "days" starts on a Monday and shows weekday letters over these day numbers, skipping weekends
   * unless `weekends` is set; "weeks" shows calendar weeks.
   */
  columns: { kind: "days"; days: number[]; weekends?: boolean } | { kind: "weeks"; from: number; count: number };
  rows: { name: string; tag?: string; cells: string }[];
  /** Minimum people in per column; null where it doesn't apply. */
  min?: (number | null)[];
  /** Show how many vacation days each row costs. */
  tally?: boolean;
};

const SCENARIOS: Scenario[] = [
  {
    // Practice, two weeks from Monday 1 March 2027.
    columns: { kind: "days", days: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12] },
    rows: [
      { name: "Dr. Weber", cells: "....vvvvv." },
      { name: "Dr. Kaya", cells: ".........." },
      { name: "Lena", cells: "...vv....." },
      { name: "Mia", cells: "....p....." },
      { name: "Tom", cells: "vv........" },
      { name: "Sara", cells: "......vvv." },
    ],
    min: Array(10).fill(4),
  },
  {
    // Care, one week from Monday 7 June 2027.
    columns: { kind: "days", days: [7, 8, 9, 10, 11, 12, 13], weekends: true },
    rows: [
      { name: "Sabine", cells: "vvvxxxx" },
      { name: "Jonas", cells: ".xx..vv" },
      { name: "Petra", cells: ".....xx" },
      { name: "Ali", cells: "xx....." },
    ],
    tally: true,
  },
  {
    // Kita, summer weeks.
    columns: { kind: "weeks", from: 28, count: 8 },
    rows: [
      { name: "Anne", cells: "vv......" },
      { name: "Bea", cells: "..vv...." },
      { name: "Cem", cells: "...pp..." },
      { name: "Dana", cells: "...v.vv." },
      { name: "Eva", cells: "......vv" },
      { name: "Finn", cells: "pp......" },
    ],
    min: Array(8).fill(4),
  },
  {
    // Trades, the week of Corpus Christi, Thursday 27 May 2027.
    columns: { kind: "days", days: [24, 25, 26, 27, 28] },
    rows: [
      { name: "Jan", tag: "NRW", cells: "...h." },
      { name: "Kai", tag: "NRW", cells: "...hv" },
      { name: "Luis", tag: "BE", cells: "....." },
      { name: "Ole", tag: "BE", cells: "vv..." },
    ],
  },
  {
    // Restaurant, one week from Monday 5 July 2027; weekends need people.
    columns: { kind: "days", days: [5, 6, 7, 8, 9, 10, 11], weekends: true },
    rows: [
      { name: "Ida", cells: "vv....." },
      { name: "Max", cells: ".....p." },
      { name: "Noah", cells: ".....v." },
      { name: "Rosa", cells: "....vv." },
      { name: "Sven", cells: "......." },
      { name: "Tara", cells: "...v..." },
    ],
    min: [null, null, null, null, 4, 4, null],
  },
  {
    // Office, the week of Ascension Day, Thursday 6 May 2027.
    columns: { kind: "days", days: [3, 4, 5, 6, 7] },
    rows: [
      { name: "Uwe", cells: "...hb" },
      { name: "Vera", cells: "vv.h." },
      { name: "Will", cells: "...h." },
    ],
  },
];

const CELL: Record<string, string> = {
  v: "bg-sky-500",
  p: "pending-stripes bg-sky-400/80",
  h: "bg-rose-400/70",
  x: "bg-[repeating-linear-gradient(135deg,rgb(0_0_0/0.10)_0_2px,transparent_2px_6px)] dark:bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.14)_0_2px,transparent_2px_6px)]",
  b: "border-2 border-dashed border-sky-500 bg-sky-500/10",
  ".": "bg-black/[0.05] dark:bg-white/[0.07]",
};

export function TeamSwitcher() {
  const t = useI18n().t.landing.audiences;
  const [active, setActive] = useState(0);
  const item = t.items[active];
  const scenario = SCENARIOS[active];

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_1fr] lg:gap-10">
      <div
        role="tablist"
        aria-label={t.pick}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
      >
        {t.items.map((it, i) => (
          <button
            key={it.tab}
            role="tab"
            id={`team-tab-${i}`}
            aria-selected={i === active}
            aria-controls="team-panel"
            onClick={() => setActive(i)}
            className={`shrink-0 rounded-full px-4 py-2 text-left text-sm font-medium whitespace-nowrap transition-colors lg:rounded-lg lg:py-2.5 ${
              i === active
                ? "bg-foreground text-background"
                : "border border-border bg-surface text-muted hover:text-foreground lg:border-transparent lg:bg-transparent"
            }`}
          >
            <span className="lg:hidden">{it.tab}</span>
            <span className="hidden lg:inline">{it.title}</span>
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id="team-panel"
        aria-labelledby={`team-tab-${active}`}
        key={active}
        className="pop-in grid items-start gap-6 md:grid-cols-2"
      >
        <div className="space-y-3">
          <h3 className="font-display text-2xl font-semibold tracking-tight">{item.title}</h3>
          <p className="text-muted">
            <span className="font-hand mr-1 text-xl text-sky-700 dark:text-sky-300">{t.example}:</span>
            {item.story}
          </p>
          <ul className="flex flex-wrap gap-1.5" aria-label={item.title}>
            {item.tags.map((tag) => (
              <li key={tag} className="rounded-md bg-black/[0.05] px-2 py-0.5 text-xs font-medium dark:bg-white/10">
                {tag}
              </li>
            ))}
          </ul>
        </div>
        <ScenarioCard scenario={scenario} caption={item.caption} />
      </div>
    </div>
  );
}

function ScenarioCard({ scenario, caption }: { scenario: Scenario; caption: string }) {
  const { t: messages } = useI18n();
  const t = messages.landing.audiences;
  const { columns } = scenario;
  const cols =
    columns.kind === "weeks"
      ? Array.from({ length: columns.count }, (_, i) => ({ top: t.week, bottom: String(columns.from + i) }))
      : columns.days.map((d, i) => ({ top: t.weekdays[i % (columns.weekends ? 7 : 5)], bottom: String(d) }));
  const n = cols.length;
  const present = cols.map((_, i) => scenario.rows.filter((r) => r.cells[i] === "." || r.cells[i] === "b").length);
  const used = new Set(scenario.rows.flatMap((r) => [...r.cells]));
  const short = scenario.min?.some((m, i) => m !== null && present[i] < m);
  const legend = (["v", "p", "h", "x", "b"] as const).filter((c) => used.has(c));
  const label = { v: t.legend.vacation, p: t.legend.pending, h: t.legend.holiday, x: t.legend.off, b: t.legend.bridge };

  return (
    <figure className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div
        aria-hidden
        className="grid gap-1 text-[11px]"
        style={{ gridTemplateColumns: `4.5rem repeat(${n}, minmax(0, 1fr))${scenario.tally ? " 2rem" : ""}` }}
      >
        <span />
        {cols.map((c, i) => (
          <span key={i} className="text-center leading-tight text-muted">
            <span className="block">{c.top}</span>
            <span className="block font-medium text-foreground">{c.bottom}</span>
          </span>
        ))}
        {scenario.tally && <span />}
        {scenario.rows.map((r) => (
          <Row key={r.name} name={r.name} tag={r.tag}>
            {[...r.cells].map((c, i) => (
              <span key={i} className={`h-6 rounded-[5px] ${CELL[c]}`} />
            ))}
            {scenario.tally && (
              <span className="self-center text-right font-semibold tabular-nums">{[...r.cells].filter((c) => c === "v").length || ""}</span>
            )}
          </Row>
        ))}
        {scenario.min && (
          <>
            <span className="self-center font-medium text-muted">{t.present}</span>
            {present.map((p, i) => {
              const m = scenario.min![i];
              return (
                <span
                  key={i}
                  className={`grid h-6 place-items-center rounded-[5px] font-semibold tabular-nums ${
                    m === null ? "text-muted/50" : p < m ? "bg-red-500 text-white" : "text-muted"
                  }`}
                >
                  {m === null ? "·" : p}
                </span>
              );
            })}
          </>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted" aria-hidden>
        {legend.map((c) => (
          <span key={c} className="flex items-center gap-1">
            <span className={`inline-block size-2.5 rounded-sm ${CELL[c]}`} />
            {label[c]}
          </span>
        ))}
        {short && (
          <span className="flex items-center gap-1">
            <span className="inline-block size-2.5 rounded-sm bg-red-500" />
            {t.legend.warn}
          </span>
        )}
      </div>
      <figcaption className="mt-3 border-t border-border pt-3 text-sm">{caption}</figcaption>
    </figure>
  );
}

function Row({ name, tag, children }: { name: string; tag?: string; children: React.ReactNode }) {
  return (
    <>
      <span className="flex min-w-0 items-center gap-1 self-center truncate font-medium">
        <span className="truncate">{name}</span>
        {tag && <span className="rounded bg-black/[0.06] px-1 text-[9px] text-muted dark:bg-white/10">{tag}</span>}
      </span>
      {children}
    </>
  );
}
