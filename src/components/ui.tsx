import { CalendarCheck2 } from "lucide-react";

/** The calendar-check mark on the brand blue, sized by className. */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-grid shrink-0 place-items-center rounded-[30%] bg-[#0878a4] text-white ${className}`}>
      <CalendarCheck2 className="size-[60%]" strokeWidth={2.25} />
    </span>
  );
}

/** "Ada Lovelace" → "AL", "ada@x.com" → "A", "Marie Schmitt (Empfang)" → "MS". */
export function initials(label: string): string {
  const words = label
    .split("@")[0]
    .replace(/\s*\(.*\)\s*$/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  const letters =
    words.length === 1 ? words[0][0] : words[0][0] + words[words.length - 1][0];
  return letters.toUpperCase();
}

/** Initials on the soft brand tint, as in the design; the name next to it tells people apart. */
export function Avatar({ label, className = "size-7 text-xs" }: { label: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-[33%] bg-primary-soft font-semibold text-primary-ink ${className}`}
    >
      {initials(label)}
    </span>
  );
}

/** A friendly placeholder for lists with nothing in them. */
export function EmptyState({
  icon,
  children,
}: {
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[10px] bg-surface-muted px-3 py-3 text-sm text-muted [&_a]:text-primary-ink">
      <span className="text-lg" aria-hidden>
        {icon}
      </span>
      <div>{children}</div>
    </div>
  );
}

/** Marks a made-up person from "Fill with a sample team". */
export function SampleBadge({
  label,
  className = "ml-1.5",
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`${className} inline-block rounded bg-warning-soft px-1.5 py-px align-middle text-[10px] font-semibold tracking-wide text-warning uppercase`}
    >
      {label}
    </span>
  );
}
