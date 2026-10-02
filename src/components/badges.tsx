const typeStyles = {
  VACATION: { label: "Vacation", className: "bg-sky-500" },
  SICK: { label: "Sick", className: "bg-amber-500" },
  OTHER: { label: "Other", className: "bg-violet-500" },
} as const;

export type BookingTypeKey = keyof typeof typeStyles;

export function typeColor(type: BookingTypeKey) {
  return typeStyles[type].className;
}

export function TypeDot({ type }: { type: BookingTypeKey }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${typeStyles[type].className}`} />;
}

export function typeLabel(type: BookingTypeKey) {
  return typeStyles[type].label;
}

const statusStyles = {
  PENDING: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  APPROVED: "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200",
  REJECTED: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  CANCELLED: "bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60",
} as const;

export function StatusBadge({ status }: { status: keyof typeof statusStyles }) {
  const label = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Declined", CANCELLED: "Cancelled" }[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}>{label}</span>;
}

export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs opacity-80">
      {(Object.keys(typeStyles) as BookingTypeKey[]).map((t) => (
        <span key={t} className="flex items-center gap-1.5">
          <TypeDot type={t} /> {typeStyles[t].label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="pending-stripes inline-block h-2.5 w-4 rounded-sm bg-sky-500" /> Pending
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-4 rounded-sm bg-gradient-to-r from-sky-500 from-50% to-transparent to-50% ring-1 ring-sky-500/40" />{" "}
        Half day
      </span>
    </div>
  );
}
