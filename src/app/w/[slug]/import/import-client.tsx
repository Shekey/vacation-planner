"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useI18n } from "@/components/i18n-provider";
import { regionName } from "@/lib/holiday-regions";
import { formatNumber } from "@/lib/i18n";
import { formatDate, formatRange } from "@/lib/dates";
import type { ImportError } from "@/lib/import";
import type { PeoplePlan, TimeOffPlan } from "@/lib/import-db";
import { applyImportAction, previewImportAction, type ImportKind } from "./actions";

/** Excel's German CSV is Windows-1252 text, not UTF-8; try UTF-8 first and fall back so umlauts survive. */
async function readFile(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export function ImportClient({ slug }: { slug: string }) {
  const { locale, t: messages } = useI18n();
  const t = messages.importer;
  const weekdays = messages.members.weekdays;
  const [kind, setKind] = useState<ImportKind>("people");
  const [text, setText] = useState("");
  const [people, setPeople] = useState<PeoplePlan | null>(null);
  const [timeOff, setTimeOff] = useState<TimeOffPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [sendWelcome, setSendWelcome] = useState(true);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setPeople(null);
    setTimeOff(null);
    setError(null);
    setDone(null);
  };
  const rowError = (e: ImportError) => (t.rowErrors[e.code] as (v?: string) => string)(e.value);

  const check = () =>
    startTransition(async () => {
      reset();
      const result = await previewImportAction(slug, kind, text);
      if (result.error) setError(result.error);
      setPeople(result.people ?? null);
      setTimeOff(result.timeOff ?? null);
    });

  const apply = () =>
    startTransition(async () => {
      const result = await applyImportAction(slug, kind, text, sendWelcome);
      if (result.error) {
        setError(result.error);
        return;
      }
      setPeople(null);
      setTimeOff(null);
      setError(null);
      setDone(result.ok ?? "");
      setText("");
    });

  const template = kind === "people" ? t.templatePeople : t.templateTimeOff;
  const addable = kind === "people" ? (people?.counts.new ?? 0) : (timeOff?.counts.ok ?? 0);
  const blocked = kind === "people" && people ? !people.room.fits : false;

  return (
    <div className="space-y-4">
      <div role="tablist" className="flex gap-1 border-b border-border">
        {(["people", "timeoff"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={kind === k}
            onClick={() => {
              setKind(k);
              reset();
              setText("");
            }}
            className={`-mb-px rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium ${
              kind === k ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {k === "people" ? t.tabs.people : t.tabs.timeOff}
          </button>
        ))}
      </div>

      <p className="text-sm">{kind === "people" ? t.peopleHelp : t.timeOffHelp}</p>
      <a
        href={`data:text/csv;charset=utf-8,${encodeURIComponent(`﻿${template}`)}`}
        download={kind === "people" ? "people.csv" : "time-off.csv"}
        className="inline-block text-sm text-primary hover:underline"
      >
        {t.templateLink}
      </a>

      <label className="block space-y-1">
        <span className="text-sm font-medium">{t.pasteLabel}</span>
        <textarea
          className="input font-mono text-xs"
          rows={8}
          value={text}
          placeholder={t.pastePlaceholder}
          onChange={(e) => {
            setText(e.target.value);
            reset();
          }}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-primary hover:underline">
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                setText(await readFile(file));
                reset();
              }
              e.target.value = "";
            }}
          />
          <span className="cursor-pointer">{t.chooseFile}</span>
        </label>
        <button className="btn-secondary" onClick={check} disabled={pending || text.trim() === ""}>
          {pending && !people && !timeOff ? t.checking : t.check}
        </button>
      </div>

      <div aria-live="polite" role="status" className="space-y-2">
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {done !== null && (
          <div className="card space-y-2 border-green-500/40 bg-green-50 text-sm dark:bg-green-900/20">
            <p className="font-medium">{done}</p>
            <p className="flex flex-wrap gap-4">
              {kind === "people" ? (
                <button className="text-primary hover:underline" onClick={() => { setKind("timeoff"); reset(); }}>
                  {t.nextTimeOff}
                </button>
              ) : (
                <Link href={`/w/${slug}/calendar`} className="text-primary hover:underline">
                  {t.seeCalendar}
                </Link>
              )}
            </p>
          </div>
        )}
      </div>

      {people && (
        <section className="space-y-3">
          <p className="text-sm font-medium">{t.peopleSummary(people.counts.new, people.counts.exists, people.counts.removed, people.counts.errors)}</p>
          <p className={`text-sm ${people.room.fits ? "text-muted" : "font-medium text-red-600"}`}>
            {t.room(people.room.max, people.room.current, people.counts.new)}
            {!people.room.fits && t.roomOver}
          </p>
          <Table
            head={[t.columns.row, t.columns.person, t.columns.details, t.columns.result]}
            rows={[...people.rows].sort((a, b) => Number(b.status === "error") - Number(a.status === "error")).map((r) => ({
              key: r.line,
              error: r.status === "error",
              cells: [
                String(r.line),
                <span key="p">
                  {r.name ?? r.email}
                  {r.name && <span className="block text-xs text-muted">{r.email}</span>}
                </span>,
                [
                  r.allowance !== null ? `${formatNumber(r.allowance, locale)} ${messages.members.daysPerYear}` : null,
                  r.workDays && r.workDays.length ? r.workDays.map((d) => weekdays[d - 1]).join(", ") : null,
                  r.employmentStart ? formatDate(r.employmentStart, { day: "numeric", month: "short", year: "numeric" }, locale) : null,
                  r.region ? regionName(r.region, locale) : null,
                  r.role === "ADMIN" ? messages.common.admin : null,
                ]
                  .filter(Boolean)
                  .join(" · "),
                r.error ? rowError(r.error) : t.status[r.status],
              ],
            }))}
          />
          {people.counts.removed > 0 && <p className="text-xs text-muted">{t.removedHint}</p>}
          {people.regionIgnored && <p className="text-xs text-muted">{t.regionIgnored}</p>}
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1 h-4 w-4" checked={sendWelcome} onChange={(e) => setSendWelcome(e.target.checked)} />
            <span>
              <span className="font-medium">{t.welcomeLabel}</span>
              <span className="block text-xs text-muted">{t.welcomeHint}</span>
            </span>
          </label>
          <button className="btn" onClick={apply} disabled={pending || addable === 0 || blocked}>
            {pending ? t.adding : t.addPeople(addable)}
          </button>
        </section>
      )}

      {timeOff && (
        <section className="space-y-3">
          <p className="text-sm font-medium">{t.timeOffSummary(timeOff.counts.ok, timeOff.counts.days, timeOff.counts.errors)}</p>
          <Table
            head={[t.columns.row, t.columns.person, t.columns.details, t.columns.result]}
            rows={[...timeOff.rows].sort((a, b) => Number(b.status === "error") - Number(a.status === "error")).map((r) => ({
              key: r.line,
              error: r.status === "error",
              cells: [
                String(r.line),
                r.who ?? r.email,
                r.start
                  ? `${formatRange(r.start, r.end, locale)}${r.type === "OTHER" ? ` · ${messages.common.type.OTHER}` : ""}${
                      r.startPart === "PM" ? ` · ${messages.common.dayPart.PM}` : r.endPart === "AM" ? ` · ${messages.common.dayPart.AM}` : ""
                    }${r.status === "ok" ? ` · ${messages.common.days(formatNumber(r.daysCount, locale))}` : ""}`
                  : "",
                r.error ? rowError(r.error) : t.status.ok,
              ],
            }))}
          />
          <button className="btn" onClick={apply} disabled={pending || addable === 0 || timeOff.overLimit}>
            {pending ? t.adding : t.addTimeOff(addable)}
          </button>
        </section>
      )}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: { key: number; error: boolean; cells: React.ReactNode[] }[] }) {
  return (
    <div className="max-h-96 overflow-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-surface text-xs text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} className="p-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={`border-t border-border align-top ${r.error ? "bg-red-500/5" : ""}`}>
              {r.cells.map((c, i) => (
                <td key={i} className={`p-2 ${i === 3 && r.error ? "text-red-700 dark:text-red-300" : ""}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
