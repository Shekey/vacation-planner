"use client";

import { useActionState, useMemo, useState } from "react";
import {
  submitKeepingInput,
  type ActionResult,
} from "@/components/action-form";
import { typeColor } from "@/components/badges";
import { useI18n } from "@/components/i18n-provider";
import {
  countDays,
  portionOn,
  spanWithout,
  spansOverlap,
  validateSpan,
  type BookingSpan,
} from "@/lib/booking-days";
import { eachDay, formatDate, formatRange, type ISODate } from "@/lib/dates";
import { formatNumber } from "@/lib/i18n";
import { understaffedDays } from "@/lib/staffing";

const SPECIAL_REASONS = ["WEDDING", "BIRTH", "BEREAVEMENT", "MOVING", "OTHER"] as const;
type SpecialReason = (typeof SPECIAL_REASONS)[number];

type Member = {
  id: string;
  name: string;
  allowance: number | null;
  takenThisYear: number;
  region: string;
  /** Part-time work days (ISO weekdays); empty means the workspace default. */
  workDays: number[];
};
type TeamBooking = BookingSpan & {
  id: string;
  membershipId: string;
  name: string;
  /** Vacation, as opposed to any other time off. */
  vacation: boolean;
};

type BuiltInType = "VACATION" | "SICK" | "SPECIAL" | "OTHER";
/** A built-in type, or "lt:<id>" for one of the admin's own leave types (#34). */
type TypeChoice = BuiltInType | `lt:${string}`;

export type BookingFormProps = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  members: Member[];
  canChooseMember: boolean;
  settings: {
    countWeekends: boolean;
    allowHalfDays: boolean;
    approvalsEnabled: boolean;
    minPeoplePresent: number | null;
    /** Booking more vacation than is left (#82). */
    overAllowance?: "WARN" | "APPROVAL" | "BLOCK";
  };
  /** Every region's holidays; only the booked person's apply. */
  holidays: { date: ISODate; name: string; region: string }[];
  memberCount: number;
  /** What the person booking may do (#77): admins skip approval, approvers too when booking for others. */
  roles: { isAdmin: boolean; decides: boolean; seesSick: boolean; selfId: string };
  currentYear: number;
  team: TeamBooking[];
  /** The admin's own leave types (#34). */
  leaveTypes: { id: string; name: string; color: string; countsAsVacation: boolean; allowanceDays: number | null; needsApproval: boolean }[];
  /** Days used this year of each leave type with its own allowance, by membership id and leave type id. */
  leaveTypeUsed: Record<string, Record<string, number>>;
  /** Everyone in the workspace, to pick a stand-in from (#34). */
  colleagues: { id: string; name: string }[];
  initial: {
    membershipId: string;
    type: TypeChoice;
    specialReason?: SpecialReason | null;
    standInId?: string | null;
    start: ISODate;
    end: ISODate;
    startPart: "FULL" | "PM";
    endPart: "FULL" | "AM";
    note: string;
    /** Set when editing, so the booking isn't counted twice or flagged as its own clash. */
    bookingId?: string;
    ownDaysThisYear?: number;
    /** When editing a booking of a leave type with its own allowance: its days this year, so they aren't counted twice. */
    ownTypeDaysThisYear?: number;
  };
};

type SingleDayPart = "FULL" | "MORNING" | "AFTERNOON";

export function BookingForm(props: BookingFormProps) {
  const { initial, settings } = props;
  const { locale, t: messages } = useI18n();
  const t = messages.book;
  const fmt = (n: number) => formatNumber(n, locale);
  const [state, formAction, pending] = useActionState(props.action, {});
  const [membershipId, setMembershipId] = useState(initial.membershipId);
  const [type, setType] = useState<TypeChoice>(initial.type);
  const leaveType = type.startsWith("lt:") ? props.leaveTypes.find((l) => `lt:${l.id}` === type) : undefined;
  const countsAsVacation = type === "VACATION" || !!leaveType?.countsAsVacation;
  const [standInId, setStandInId] = useState(initial.standInId ?? "");
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [startsPm, setStartsPm] = useState(initial.startPart === "PM");
  const [endsAm, setEndsAm] = useState(initial.endPart === "AM");
  const [singlePart, setSinglePart] = useState<SingleDayPart>(
    initial.endPart === "AM"
      ? "MORNING"
      : initial.startPart === "PM"
        ? "AFTERNOON"
        : "FULL",
  );

  const singleDay = start === end;
  const span: BookingSpan = singleDay
    ? {
        start,
        end,
        startPart: singlePart === "AFTERNOON" ? "PM" : "FULL",
        endPart: singlePart === "MORNING" ? "AM" : "FULL",
      }
    : {
        start,
        end,
        startPart: startsPm ? "PM" : "FULL",
        endPart: endsAm ? "AM" : "FULL",
      };

  const member = props.members.find((m) => m.id === membershipId);
  const region = member?.region ?? "";
  const workDays = member?.workDays;
  const holidays = useMemo(
    () => props.holidays.filter((h) => h.region === "" || h.region === region),
    [props.holidays, region],
  );
  const rules = useMemo(
    () => ({
      countWeekends: settings.countWeekends,
      workDays,
      holidays: new Set(holidays.map((h) => h.date)),
    }),
    [settings.countWeekends, workDays, holidays],
  );
  const problemKey = start && end ? validateSpan(span, settings) : null;
  const problem = problemKey ? messages.errors[problemKey] : null;
  const days = start && end && !problem ? countDays(span, rules) : 0;
  const holidaysInRange =
    start && end
      ? holidays.filter((h) => h.date >= start && h.date <= end)
      : [];
  const year = props.currentYear;
  const daysThisYear =
    start && end && !problem
      ? countDays(span, rules, { from: `${year}-01-01`, to: `${year}-12-31` })
      : 0;
  const remainingAfter =
    member?.allowance != null && countsAsVacation
      ? member.allowance -
        (member.takenThisYear - (initial.ownDaysThisYear ?? 0)) -
        daysThisYear
      : null;

  // Teammates who are off on any of the chosen days.
  const overlapping = useMemo(() => {
    if (!start || !end || end < start || eachDay(start, end).length > 366)
      return [];
    const days = eachDay(start, end);
    const names = new Map<string, string>();
    for (const b of props.team) {
      if (b.id === initial.bookingId) continue;
      if (days.some((d) => portionOn(b, d))) names.set(b.membershipId, b.name);
    }
    names.delete(membershipId);
    return [...names.values()];
  }, [start, end, props.team, initial.bookingId, membershipId]);

  // What's left of a leave type's own allowance (#34) after this booking, counted by start year like the Me page.
  const typeLeftAfter =
    leaveType?.allowanceDays != null && start.startsWith(String(year))
      ? leaveType.allowanceDays -
        ((props.leaveTypeUsed[membershipId]?.[leaveType.id] ?? 0) - (initial.ownTypeDaysThisYear ?? 0)) -
        days
      : null;

  // The stand-in is off on some of these days themselves.
  const standInAway = useMemo(() => {
    if (!standInId || !start || !end || end < start || eachDay(start, end).length > 366) return false;
    const days = eachDay(start, end);
    return props.team.some((b) => b.membershipId === standInId && b.id !== initial.bookingId && days.some((d) => portionOn(b, d)));
  }, [standInId, start, end, props.team, initial.bookingId]);
  const standInName = props.colleagues.find((c) => c.id === standInId)?.name;

  const sick = type === "SICK";
  const forSomeoneElse = membershipId !== props.roles.selfId;
  // Admins, and approvers for someone else, may always book over the allowance (#82).
  const mayGoOver = props.roles.isAdmin || (props.roles.decides && forSomeoneElse);
  const over = remainingAfter !== null && remainingAfter < 0 && !mayGoOver;
  const blocked = over && settings.overAllowance === "BLOCK";
  const willBePending =
    ((settings.approvalsEnabled && leaveType?.needsApproval !== false) || (over && settings.overAllowance === "APPROVAL")) && !sick && !mayGoOver;

  // Sick days in this person's vacation give those vacation days back (admins only, see giveBackVacation).
  const vacationReturned =
    sick && start && end && !problem
      ? props.team
          .filter(
            (b) =>
              b.vacation &&
              b.membershipId === membershipId &&
              b.id !== initial.bookingId &&
              spansOverlap(b, span),
          )
          .reduce(
            (sum, b) =>
              sum +
              countDays(b, rules) -
              spanWithout(b, span).reduce((s, p) => s + countDays(p, rules), 0),
            0,
          )
      : 0;

  const shortDays =
    start && end && !problem && eachDay(start, end).length <= 366
      ? understaffedDays({
          candidate: { ...span, membershipId },
          team: props.team.filter(
            (b) =>
              b.id !== initial.bookingId && b.membershipId !== membershipId,
          ),
          memberCount: props.memberCount,
          minPresent: settings.minPeoplePresent,
          rules,
        })
      : [];

  return (
    <form
      onSubmit={(e) => submitKeepingInput(e, formAction)}
      className="card max-w-xl space-y-5"
    >
      <input type="hidden" name="startPart" value={span.startPart} />
      <input type="hidden" name="endPart" value={span.endPart} />

      {props.canChooseMember ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t.who}</span>
          <select
            className="input"
            name="membershipId"
            value={membershipId}
            onChange={(e) => setMembershipId(e.target.value)}
          >
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
        <legend className="text-sm font-medium">{t.type}</legend>
        <div className="flex flex-wrap gap-2">
          {/* Someone else's sick days are health data: only admins enter them. */}
          {[
            ...(["VACATION", "SICK", "SPECIAL", "OTHER"] as const)
              .filter((o) => o !== "SICK" || props.roles.seesSick || !forSomeoneElse)
              .map((o) => ({ value: o as TypeChoice, label: t.typeOption[o], dot: null })),
            ...props.leaveTypes.map((l) => ({
              value: `lt:${l.id}` as TypeChoice,
              label: l.name,
              dot: typeColor("OTHER", l),
            })),
          ].map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40 text-sm ${
                type === option.value
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-surface hover:border-primary/50"
              }`}
            >
              <input
                type="radio"
                name="type"
                value={option.value}
                checked={type === option.value}
                onChange={() => setType(option.value)}
                className="sr-only"
              />
              {option.dot && <span aria-hidden className={`inline-block size-2 rounded-full ${option.dot}`} />}
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {type === "SPECIAL" && (
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t.reason}</span>
          <select className="input" name="specialReason" defaultValue={initial.specialReason ?? ""}>
            <option value="">{t.noReason}</option>
            {SPECIAL_REASONS.map((r) => (
              <option key={r} value={r}>
                {messages.common.specialReason[r]}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t.from}</span>
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
          <span className="text-sm font-medium">{t.to}</span>
          <input
            className="input"
            type="date"
            name="end"
            required
            min={start}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
      </div>

      {settings.allowHalfDays &&
        start &&
        end &&
        (singleDay ? (
          <fieldset className="flex gap-2 text-sm">
            {(["FULL", "MORNING", "AFTERNOON"] as const).map((p) => (
              <label
                key={p}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40 ${
                  singlePart === p
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-surface hover:border-primary/50"
                }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  checked={singlePart === p}
                  onChange={() => setSinglePart(p)}
                />
                {
                  messages.common.dayPart[
                    ({ FULL: "FULL", MORNING: "AM", AFTERNOON: "PM" } as const)[
                      p
                    ]
                  ]
                }
              </label>
            ))}
          </fieldset>
        ) : (
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={startsPm}
                onChange={(e) => setStartsPm(e.target.checked)}
              />
              {t.startsAfterLunch}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={endsAm}
                onChange={(e) => setEndsAm(e.target.checked)}
              />
              {t.endsAtLunch}
            </label>
          </div>
        ))}

      {/* Optional, for teams where someone must cover (#34); there's nobody to pick in a team of one. */}
      {props.colleagues.length > 1 && (
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t.standIn}</span>
          <select className="input" name="standInId" value={standInId} onChange={(e) => setStandInId(e.target.value)}>
            <option value="">{t.noStandIn}</option>
            {props.colleagues
              .filter((c) => c.id !== membershipId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <span className="block text-xs text-muted">{t.standInHint}</span>
        </label>
      )}

      <div
        className="space-y-1 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm"
        aria-live="polite"
      >
        {problem ? (
          <p className="text-danger">{problem}</p>
        ) : start && end ? (
          <>
            <p>
              <span className="font-medium">{fmt(days)}</span> {t.dayUnit(days)}
              , {formatRange(start, end, locale)}
              {workDays?.length
                ? t.onlyWorkDays
                : !settings.countWeekends &&
                  (holidaysInRange.length
                    ? t.weekendsAndHolidaysNotCounted
                    : t.weekendsNotCounted)}
              {(settings.countWeekends || workDays?.length) &&
              holidaysInRange.length > 0
                ? t.holidaysNotCounted
                : null}
            </p>
            {remainingAfter !== null && (
              <p
                className={
                  remainingAfter < 0
                    ? "text-danger"
                    : "text-muted"
                }
              >
                {remainingAfter < 0
                  ? t.overAllowance(fmt(-remainingAfter), year)
                  : t.daysLeftAfter(fmt(remainingAfter), year)}
              </p>
            )}
            {leaveType && typeLeftAfter !== null && (
              <p className={typeLeftAfter < 0 ? "text-danger" : "text-muted"}>
                {typeLeftAfter < 0
                  ? t.overTypeAllowance(leaveType.name, fmt(-typeLeftAfter), year)
                  : t.typeDaysLeftAfter(leaveType.name, fmt(typeLeftAfter), year)}
              </p>
            )}
            {holidaysInRange.length > 0 && (
              <p className="text-muted">
                {t.holidaysList(
                  holidaysInRange
                    .map(
                      (h) =>
                        `${h.name} (${formatDate(h.date, undefined, locale)})`,
                    )
                    .join(", "),
                )}
              </p>
            )}
            {shortDays.length > 0 && (
              <p className="text-danger">
                {t.understaffed(
                  shortDays[0].present,
                  props.memberCount,
                  shortDays
                    .slice(0, 3)
                    .map((d) => formatDate(d.day, undefined, locale))
                    .join(", "),
                  Math.max(0, shortDays.length - 3),
                  settings.minPeoplePresent,
                )}
              </p>
            )}
            {overlapping.length > 0 && (
              <p className="text-amber-700 dark:text-amber-400">
                {t.alsoOff(overlapping.join(", "))}
              </p>
            )}
            {standInAway && standInName && (
              <p className="text-amber-700 dark:text-amber-400">{t.standInAway(standInName)}</p>
            )}
            {blocked && <p className="text-danger">{t.overBlocked}</p>}
            {willBePending && !blocked && <p className="text-muted">{over && !settings.approvalsEnabled ? t.overNeedsApproval : t.needsApproval}</p>}
            {sick && vacationReturned > 0 && (
              <p className={props.roles.seesSick ? undefined : "text-amber-700 dark:text-amber-400"}>
                {props.roles.seesSick ? t.sickGivesBack(fmt(vacationReturned)) : t.sickAskAdmin}
              </p>
            )}
            {sick && <p className="text-muted">{t.sickHint}</p>}
            {type === "SPECIAL" && <p className="text-muted">{t.specialHint}</p>}
          </>
        ) : (
          <p className="text-muted">{t.pickDates}</p>
        )}
      </div>

      {state.error && (
        <p className="text-sm text-danger">{state.error}</p>
      )}
      <button
        className="btn"
        disabled={pending || Boolean(problem) || days === 0 || blocked}
      >
        {pending
          ? t.saving
          : initial.bookingId
            ? t.saveChanges
            : willBePending
              ? t.requestTimeOff
              : t.bookTimeOff}
      </button>
    </form>
  );
}
