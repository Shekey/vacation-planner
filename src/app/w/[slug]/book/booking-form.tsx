"use client";

import { useActionState, useMemo, useState } from "react";
import { submitKeepingInput, type ActionResult } from "@/components/action-form";
import { countDays, portionOn, validateSpan, type BookingSpan } from "@/lib/booking-days";
import { eachDay, formatDate, formatRange, type ISODate } from "@/lib/dates";
import { understaffedDays } from "@/lib/staffing";

type Member = {
  id: string;
  name: string;
  allowance: number | null;
  takenThisYear: number;
  region: string;
  /** Part-time work days (ISO weekdays); empty means the workspace default. */
  workDays: number[];
};
type TeamBooking = BookingSpan & { id: string; membershipId: string; name: string };

export type BookingFormProps = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  members: Member[];
  canChooseMember: boolean;
  settings: { countWeekends: boolean; allowHalfDays: boolean; approvalsEnabled: boolean; minPeoplePresent: number | null };
  /** Every region's holidays; only the booked person's apply. */
  holidays: { date: ISODate; name: string; region: string }[];
  memberCount: number;
  isAdmin: boolean;
  currentYear: number;
  team: TeamBooking[];
  initial: {
    membershipId: string;
    type: "VACATION" | "SICK" | "OTHER";
    start: ISODate;
    end: ISODate;
    startPart: "FULL" | "PM";
    endPart: "FULL" | "AM";
    note: string;
    /** Set when editing, so the booking isn't counted twice or flagged as its own clash. */
    bookingId?: string;
    ownDaysThisYear?: number;
  };
};

type SingleDayPart = "FULL" | "MORNING" | "AFTERNOON";

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function BookingForm(props: BookingFormProps) {
  const { initial, settings } = props;
  const [state, formAction, pending] = useActionState(props.action, {});
  const [membershipId, setMembershipId] = useState(initial.membershipId);
  const [type, setType] = useState(initial.type === "SICK" ? "OTHER" : initial.type);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [startsPm, setStartsPm] = useState(initial.startPart === "PM");
  const [endsAm, setEndsAm] = useState(initial.endPart === "AM");
  const [singlePart, setSinglePart] = useState<SingleDayPart>(
    initial.endPart === "AM" ? "MORNING" : initial.startPart === "PM" ? "AFTERNOON" : "FULL",
  );

  const singleDay = start === end;
  const span: BookingSpan = singleDay
    ? {
        start,
        end,
        startPart: singlePart === "AFTERNOON" ? "PM" : "FULL",
        endPart: singlePart === "MORNING" ? "AM" : "FULL",
      }
    : { start, end, startPart: startsPm ? "PM" : "FULL", endPart: endsAm ? "AM" : "FULL" };

  const member = props.members.find((m) => m.id === membershipId);
  const region = member?.region ?? "";
  const workDays = member?.workDays;
  const holidays = useMemo(
    () => props.holidays.filter((h) => h.region === "" || h.region === region),
    [props.holidays, region],
  );
  const rules = useMemo(
    () => ({ countWeekends: settings.countWeekends, workDays, holidays: new Set(holidays.map((h) => h.date)) }),
    [settings.countWeekends, workDays, holidays],
  );
  const problem = start && end ? validateSpan(span, settings) : null;
  const days = start && end && !problem ? countDays(span, rules) : 0;
  const holidaysInRange = start && end ? holidays.filter((h) => h.date >= start && h.date <= end) : [];
  const year = props.currentYear;
  const daysThisYear =
    start && end && !problem ? countDays(span, rules, { from: `${year}-01-01`, to: `${year}-12-31` }) : 0;
  const remainingAfter =
    member?.allowance != null && type === "VACATION"
      ? member.allowance - (member.takenThisYear - (initial.ownDaysThisYear ?? 0)) - daysThisYear
      : null;

  // Teammates who are off on any of the chosen days.
  const overlapping = useMemo(() => {
    if (!start || !end || end < start || eachDay(start, end).length > 366) return [];
    const days = eachDay(start, end);
    const names = new Map<string, string>();
    for (const b of props.team) {
      if (b.id === initial.bookingId) continue;
      if (days.some((d) => portionOn(b, d))) names.set(b.membershipId, b.name);
    }
    names.delete(membershipId);
    return [...names.values()];
  }, [start, end, props.team, initial.bookingId, membershipId]);

  const willBePending = settings.approvalsEnabled && !props.isAdmin;

  const shortDays =
    start && end && !problem && eachDay(start, end).length <= 366
      ? understaffedDays({
          candidate: { ...span, membershipId },
          team: props.team.filter((b) => b.id !== initial.bookingId && b.membershipId !== membershipId),
          memberCount: props.memberCount,
          minPresent: settings.minPeoplePresent,
          rules,
        })
      : [];

  return (
    <form onSubmit={(e) => submitKeepingInput(e, formAction)} className="card max-w-xl space-y-5">
      <input type="hidden" name="startPart" value={span.startPart} />
      <input type="hidden" name="endPart" value={span.endPart} />

      {props.canChooseMember ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium">Who</span>
          <select className="input" name="membershipId" value={membershipId} onChange={(e) => setMembershipId(e.target.value)}>
            {props.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="membershipId" value={membershipId} />
      )}

      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Type</legend>
        <div className="flex gap-2">
          {/* Sick leave isn't offered: it would be health data (Art. 9 GDPR). */}
          {(["VACATION", "OTHER"] as const).map((t) => (
            <label
              key={t}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40 text-sm ${
                type === t ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-surface hover:border-primary/50"
              }`}
            >
              <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
              {{ VACATION: "Vacation", OTHER: "Other time off" }[t]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">From</span>
          <input
            className="input"
            type="date"
            name="start"
            required
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              if (!end || e.target.value > end) setEnd(e.target.value);
            }}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">To</span>
          <input className="input" type="date" name="end" required min={start} value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>

      {settings.allowHalfDays && start && end && (
        singleDay ? (
          <fieldset className="flex gap-2 text-sm">
            {(["FULL", "MORNING", "AFTERNOON"] as const).map((p) => (
              <label
                key={p}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40 ${
                  singlePart === p ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-surface hover:border-primary/50"
                }`}
              >
                <input type="radio" className="sr-only" checked={singlePart === p} onChange={() => setSinglePart(p)} />
                {{ FULL: "Full day", MORNING: "Morning", AFTERNOON: "Afternoon" }[p]}
              </label>
            ))}
          </fieldset>
        ) : (
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={startsPm} onChange={(e) => setStartsPm(e.target.checked)} />
              First day starts after lunch
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={endsAm} onChange={(e) => setEndsAm(e.target.checked)} />
              Last day ends at lunch
            </label>
          </div>
        )
      )}

      <div className="space-y-1 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm" aria-live="polite">
        {problem ? (
          <p className="text-red-600">{problem}</p>
        ) : start && end ? (
          <>
            <p>
              <span className="font-medium">{fmt(days)}</span> {days === 1 ? "day" : "days"},{" "}
              {formatRange(start, end)}
              {workDays?.length
                ? " (only work days counted)"
                : !settings.countWeekends && (holidaysInRange.length ? " (weekends and holidays not counted)" : " (weekends not counted)")}
              {(settings.countWeekends || workDays?.length) && holidaysInRange.length > 0 ? " (holidays not counted)" : null}
            </p>
            {remainingAfter !== null && (
              <p className={remainingAfter < 0 ? "text-red-600" : "opacity-70"}>
                {remainingAfter < 0
                  ? `This is ${fmt(-remainingAfter)} days over the ${year} allowance.`
                  : `${fmt(remainingAfter)} vacation days left in ${year} after this.`}
              </p>
            )}
            {holidaysInRange.length > 0 && (
              <p className="opacity-70">
                Holidays: {holidaysInRange.map((h) => `${h.name} (${formatDate(h.date)})`).join(", ")}
              </p>
            )}
            {shortDays.length > 0 && (
              <p className="text-red-600">
                Only {shortDays[0].present} of {props.memberCount} would be in on{" "}
                {shortDays.slice(0, 3).map((d) => formatDate(d.day)).join(", ")}
                {shortDays.length > 3 && ` and ${shortDays.length - 3} more day${shortDays.length === 4 ? "" : "s"}`}. The team wants at least{" "}
                {settings.minPeoplePresent} in.
              </p>
            )}
            {overlapping.length > 0 && (
              <p className="text-amber-700 dark:text-amber-400">Also off during these days: {overlapping.join(", ")}</p>
            )}
            {willBePending && <p className="opacity-70">An admin will need to approve this.</p>}
          </>
        ) : (
          <p className="opacity-70">Pick your dates.</p>
        )}
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn" disabled={pending || Boolean(problem) || days === 0}>
        {pending ? "Saving…" : initial.bookingId ? "Save changes" : willBePending ? "Request time off" : "Book time off"}
      </button>
    </form>
  );
}
