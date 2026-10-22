import { Ban, Check, Clock3, X } from "lucide-react";
import type { SpecialReason } from "@/generated/prisma/enums";
import { messagesFor, type Locale } from "@/lib/i18n";

const typeStyles = {
  VACATION: { className: "bg-sky-500" },
  SICK: { className: "bg-amber-500" },
  SPECIAL: { className: "bg-emerald-500" },
  OTHER: { className: "bg-violet-500" },
} as const;

export type BookingTypeKey = keyof typeof typeStyles;

export function typeColor(type: BookingTypeKey) {
  return typeStyles[type].className;
}

/** Colour dot for a booking type; screen readers hear the type unless `decorative` (the label is already next to it). */
export function TypeDot({ type, decorative, locale }: { type: BookingTypeKey; decorative?: boolean; locale: Locale }) {
  const className = `inline-block h-2.5 w-2.5 shrink-0 rounded-full ${typeStyles[type].className}`;
  return decorative ? (
    <span aria-hidden className={className} />
  ) : (
    <span role="img" aria-label={typeLabel(type, locale)} className={className} />
  );
}

/** "Special leave (wedding)" when a reason is given and the viewer may see it (see forViewer). */
export function typeLabel(type: BookingTypeKey, locale: Locale, specialReason?: SpecialReason | null) {
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

/** `withSick` for admins, the only ones who see colleagues' sick days as sick. */
export function Legend({ locale, withSick }: { locale: Locale; withSick?: boolean }) {
  const t = messagesFor(locale).common;
  const types = withSick ? (["VACATION", "SICK", "SPECIAL", "OTHER"] as const) : (["VACATION", "SPECIAL", "OTHER"] as const);
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs opacity-80">
      {types.map((type) => (
        <span key={type} className="flex items-center gap-1.5">
          <TypeDot type={type} decorative locale={locale} /> {t.type[type]}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="pending-stripes inline-block h-2.5 w-4 rounded-sm bg-sky-500" /> {t.legend.pending}
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
