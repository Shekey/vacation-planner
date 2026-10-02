/** The sun-over-waves mark from the app icon, sized by className. */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="14" fill="#0ea5e9" />
      <circle cx="44" cy="20" r="8" fill="#fde047" />
      <path d="M10 46c8-6 14-6 22 0s14 6 22 0v8H10z" fill="#ffffff" />
    </svg>
  );
}

const AVATAR_COLORS = [
  "bg-sky-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-orange-500",
];

/** "Ada Lovelace" → "AL", "ada@x.com" → "A". */
export function initials(label: string): string {
  const words = label.split("@")[0].split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? words[0][0] : words[0][0] + words[words.length - 1][0];
  return letters.toUpperCase();
}

/** A stable color per person, so someone looks the same everywhere. */
function colorFor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function Avatar({ label, seed, className = "size-7 text-xs" }: { label: string; seed?: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ${colorFor(seed ?? label)} ${className}`}
    >
      {initials(label)}
    </span>
  );
}

/** A friendly placeholder for lists with nothing in them. */
export function EmptyState({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-black/[0.025] px-3 py-3 text-sm text-muted dark:bg-white/[0.03]">
      <span className="text-lg" aria-hidden>
        {icon}
      </span>
      <div>{children}</div>
    </div>
  );
}
