"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { LogoMark } from "@/components/ui";

/*
 * A looping, scripted run through the product: Anna books five days, an admin approves them,
 * her days left drop, then Ben's request for Friday trips the staffing warning.
 * Two weeks of March 2027 (1 March is a Monday); columns are weekdays only.
 */
const DAYS = [1, 2, 3, 4, 5, 8, 9, 10, 11, 12];
const MIN_PRESENT = 3;
const ANNA = [2, 3, 4, 5, 6]; // Wed 3 to Tue 9 March
const BEN = 4; // Fri 5 March
const FIXED: Record<string, number[]> = { Clara: [7, 8, 9], Deniz: [3, 4] };
const PEOPLE = ["Anna", "Ben", "Clara", "Deniz", "Emil"];

type Frame = { filled: number; card: "none" | "label" | "request" | "approved"; cursor: 0 | 1 | 2; ben: boolean; ms: number };

const SCRIPT: Frame[] = [
  { filled: 0, card: "none", cursor: 0, ben: false, ms: 1100 },
  ...[1, 2, 3, 4, 5].map((n): Frame => ({ filled: n, card: "label", cursor: 0, ben: false, ms: n === 5 ? 700 : 190 })),
  { filled: 5, card: "request", cursor: 1, ben: false, ms: 800 },
  { filled: 5, card: "request", cursor: 2, ben: false, ms: 450 },
  { filled: 5, card: "approved", cursor: 2, ben: false, ms: 1900 },
  { filled: 5, card: "approved", cursor: 0, ben: true, ms: 3200 },
];
const LAST = SCRIPT.length - 1;

export function HeroDemo() {
  const t = useI18n().t.landing.demo;
  const [step, setStep] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(LAST);
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current = 0;
    const tick = () => {
      timer = setTimeout(() => {
        current = current === LAST ? 0 : current + 1;
        setStep(current);
        tick();
      }, SCRIPT[current].ms);
    };
    // Only plays while on screen.
    const observer = new IntersectionObserver(([entry]) => {
      clearTimeout(timer);
      if (entry.isIntersecting) tick();
    });
    if (ref.current) observer.observe(ref.current);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  const f = SCRIPT[step];
  const approved = f.card === "approved";
  const off = (person: string, i: number): "solid" | "pending" | null => {
    if (person === "Anna" && ANNA.indexOf(i) > -1 && ANNA.indexOf(i) < f.filled) return approved ? "solid" : "pending";
    if (person === "Ben" && i === BEN && f.ben) return "pending";
    return FIXED[person]?.includes(i) ? "solid" : null;
  };
  const present = DAYS.map((_, i) => PEOPLE.filter((p) => !off(p, i)).length);

  return (
    <figure ref={ref} className="relative">
      <figcaption className="sr-only">{t.label}</figcaption>
      <div aria-hidden className="rounded-2xl border border-border bg-surface p-4 shadow-[0_24px_60px_-20px_rgb(12_74_110/0.35)] sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <LogoMark className="size-6" />
            {t.team}
          </div>
          <span className="text-xs text-muted">{t.month}</span>
        </div>

        <div className="grid grid-cols-[3.25rem_repeat(10,minmax(0,1fr))] gap-x-1 gap-y-1.5 text-[11px] sm:grid-cols-[4rem_repeat(10,minmax(0,1fr))]">
          <span />
          {DAYS.map((d, i) => (
            <span key={d} className={`text-center leading-tight text-muted ${i === 5 ? "ml-1.5" : ""}`}>
              <span className="block">{t.weekdays[i % 5]}</span>
              <span className="block font-medium text-foreground">{d}</span>
            </span>
          ))}
          {PEOPLE.map((p) => (
            <Row key={p} name={p}>
              {DAYS.map((d, i) => {
                const kind = off(p, i);
                return (
                  <span
                    key={d}
                    className={`h-6 rounded-[5px] transition-all duration-300 ${i === 5 ? "ml-1.5" : ""} ${
                      kind === "solid"
                        ? "bg-sky-500"
                        : kind === "pending"
                          ? "pending-stripes scale-100 bg-sky-400/80"
                          : "bg-black/[0.05] dark:bg-white/[0.07]"
                    }`}
                  />
                );
              })}
            </Row>
          ))}
          <span className="self-center pt-1 font-medium text-muted">{t.present}</span>
          {present.map((n, i) => (
            <span
              key={i}
              className={`grid h-6 place-items-center rounded-[5px] pt-0 font-semibold tabular-nums transition-colors duration-300 ${i === 5 ? "ml-1.5" : ""} ${
                n < MIN_PRESENT ? "bg-red-500 text-white" : "text-muted"
              }`}
            >
              {n}
            </span>
          ))}
        </div>

        <div className="relative mt-4 h-14">
          {f.card === "label" && (
            <p className="pop-in flex h-full items-center text-sm text-muted">
              <span className="font-hand mr-2 text-xl text-sky-700 dark:text-sky-300">✎</span>
              {t.booking}
            </p>
          )}
          {(f.card === "request" || f.card === "approved") && !f.ben && (
            <div className="pop-in flex h-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3">
              <div className="min-w-0 text-sm">
                <div className="font-semibold">Anna</div>
                <div className="truncate text-xs text-muted">{t.request}</div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span key={approved ? "after" : "before"} className="pop-in text-right text-xs text-muted">
                  <span className="block text-base font-semibold text-foreground tabular-nums">{approved ? 20 : 25}</span>
                  {t.daysLeft}
                </span>
                <span
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                    approved ? "bg-green-600 text-white" : "bg-primary text-primary-foreground"
                  } ${f.cursor === 2 && !approved ? "scale-95" : ""}`}
                >
                  {approved ? `✓ ${t.approved}` : t.approve}
                </span>
              </div>
            </div>
          )}
          {f.ben && (
            <div className="pop-in flex h-full items-center gap-3 rounded-xl border border-red-500/40 bg-red-50 px-3 text-sm font-medium text-red-800 dark:bg-red-950/40 dark:text-red-200">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-red-500 text-xs font-bold text-white">!</span>
              {t.warning}
            </div>
          )}
          {/* The pointer that "clicks" Approve. */}
          <svg
            viewBox="0 0 24 24"
            className={`pointer-events-none absolute size-6 drop-shadow transition-all duration-700 ease-out ${
              f.cursor === 0 ? "right-1/3 -bottom-6 opacity-0" : f.cursor === 1 ? "right-1/4 bottom-0 opacity-100" : "right-6 bottom-1 opacity-100"
            }`}
          >
            <path d="M4 2l15 9-6.5 1.5L9.5 19z" fill="#141821" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </figure>
  );
}

function Row({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <>
      <span className="flex items-center gap-1.5 truncate font-medium">
        <span className="hidden size-5 shrink-0 place-items-center rounded-full bg-black/[0.06] text-[10px] sm:grid dark:bg-white/10">
          {name[0]}
        </span>
        {name}
      </span>
      {children}
    </>
  );
}
