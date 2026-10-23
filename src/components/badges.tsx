import { Ban, Check, Clock3, X } from "lucide-react";
import type { SpecialReason } from "@/generated/prisma/enums";
import { messagesFor, type Locale } from "@/lib/i18n";

const typeStyles = {
  VACATION: { className: "bg-success" },
  SICK: { className: "bg-amber-500" },
  SPECIAL: { className: "bg-accent" },
  OTHER: { className: "bg-violet-500" },
} as const;

export type BookingTypeKey = keyof typeof typeStyles;

/** Colours an admin can give their own leave types (#34), apart from the built-in ones. Literal classes for Tailwind. */
export const LEAVE_COLORS = {
  blue: "bg-blue-600",
  teal: "bg-teal-500",
  indigo: "bg-indigo-500",
  rose: "bg-rose-400",
  orange: "bg-orange-500",
  lime: "bg-lime-500",
  fuchsia: "bg-fuchsia-500",
  slate: "bg-slate-500",
} as const;

export type LeaveColor = keyof typeof LEAVE_COLORS;
export const isLeaveColor = (c: unknown): c is LeaveColor => typeof c === "string" && Object.hasOwn(LEAVE_COLORS, c);

/** An admin-defined leave type on a booking, when it has one; it replaces the built-in name and colour. */
export type LeaveTypeLabel = { name: string; color: string } | null | undefined;

export function typeColor(type: BookingTypeKey, leaveType?: LeaveTypeLabel) {
  return leaveType && isLeaveColor(leaveType.color) ? LEAVE_COLORS[leaveType.color] : typeStyles[type].className;
}

/** Colour dot for a booking type; screen readers hear the type unless `decorative` (the label is already next to it). */
export function TypeDot({ type, decorative, locale, leaveType }: { type: BookingTypeKey; decorative?: boolean; locale: Locale; leaveType?: LeaveTypeLabel }) {
  const className = `inline-block h-2.5 w-2.5 shrink-0 rounded-full ${typeColor(type, leaveType)}`;
  return decorative ? (
    <span aria-hidden className={className} />
  ) : (
    <span role="img" aria-label={typeLabel(type, locale, null, leaveType)} className={className} />
  );
}

/**
 * "Special leave (wedding)" when a reason is given and the viewer may see it (see forViewer), or the name of the admin's
 * own leave type.
 */
export function typeLabel(type: BookingTypeKey, locale: Locale, specialReason?: SpecialReason | null, leaveType?: LeaveTypeLabel) {
  if (leaveType) return leaveType.name;
  const t = messagesFor(locale).common;
  return type === "SPECIAL" && specialReason ? `${t.type[type]} (${t.specialReason[specialReason]})` : t.type[type];
}

const statusStyles = {
  PENDING: { className: "bg-warning-soft text-warning", Icon: Clock3 },
  APPROVED: { className: "bg-success-soft text-success", Icon: Check },
  REJECTED: { className: "bg-danger-soft text-danger", Icon: X },
  CANCELLED: { className: "bg-surface-muted text-muted", Icon: Ban },
} as const;

/** Status as icon + label, never colour alone (design guidance). */
export function StatusBadge({ status, locale }: { status: keyof typeof statusStyles; locale: Locale }) {
  const label = messagesFor(locale).common.status[status];
  const { className, Icon } = statusStyles[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${className}`}>
      <Icon aria-hidden className="size-3" strokeWidth={2.5} />
      {label}
    </span>
  );
}

/** `withSick` for admins, the only ones who see colleagues' sick days as sick; `leaveTypes` are the admin's own (#34). */
export function Legend({ locale, withSick, leaveTypes = [] }: { locale: Locale; withSick?: boolean; leaveTypes?: { id: string; name: string; color: string }[] }) {
  const t = messagesFor(locale).common;
  const types = withSick ? (["VACATION", "SICK", "SPECIAL", "OTHER"] as const) : (["VACATION", "SPECIAL", "OTHER"] as const);
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs opacity-80">
      {types.map((type) => (
        <span key={type} className="flex items-center gap-1.5">
          <TypeDot type={type} decorative locale={locale} /> {t.type[type]}
        </span>
      ))}
      {leaveTypes.map((l) => (
        <span key={l.id} className="flex items-center gap-1.5">
          <TypeDot type="OTHER" leaveType={l} decorative locale={locale} /> {l.name}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="pending-stripes inline-block h-2.5 w-4 rounded-sm bg-success" /> {t.legend.pending}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-4 rounded-sm bg-rose-500/20" /> {t.legend.holiday}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-4 rounded-sm bg-gradient-to-r from-sky-500 from-50% to-transparent to-50% ring-1 ring-sky-500/40" />{" "}
        {t.legend.halfDay}
      </span>
    </div>
  );
}
