"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean; primary?: boolean };

/** The phone's main navigation, in thumb reach; booking sits in the middle as the main action. */
export function BottomNav({ items, label }: { items: Item[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={label}
      className="bottom-nav fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = ICONS[item.icon];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium ${
                  active ? "text-primary" : "text-muted"
                }`}
              >
                {item.primary ? (
                  <span className="-mt-4 grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-sky-900/20">
                    <Icon />
                  </span>
                ) : (
                  <Icon />
                )}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-6" aria-hidden>
      {children}
    </svg>
  );
}

const ICONS = {
  home: () => (
    <Svg>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1Z" />
    </Svg>
  ),
  calendar: () => (
    <Svg>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </Svg>
  ),
  plus: () => (
    <Svg>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  ),
  people: () => (
    <Svg>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.8a3 3 0 0 1 0 5.4M17.5 14.2A5.5 5.5 0 0 1 20.5 19" />
    </Svg>
  ),
  me: () => (
    <Svg>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </Svg>
  ),
};
