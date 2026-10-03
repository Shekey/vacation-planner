import { messagesFor, type Locale } from "@/lib/i18n";

const typeStyles = {
  VACATION: { className: "bg-sky-500" },
  SICK: { className: "bg-amber-500" },
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

export function typeLabel(type: BookingTypeKey, locale: Locale) {
  return messagesFor(locale).common.type[type];
}

const statusStyles = {
  PENDING: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  APPROVED: "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200",
  REJECTED: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  CANCELLED: "bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60",
} as const;

export function StatusBadge({ status, locale }: { status: keyof typeof statusStyles; locale: Locale }) {
  const label = messagesFor(locale).common.status[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}>{label}</span>;
}

export function Legend({ locale }: { locale: Locale }) {
  const t = messagesFor(locale).common;
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs opacity-80">
      {(["VACATION", "OTHER"] as const).map((type) => (
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
