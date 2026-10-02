"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({ href, children, exact }: { href: string; children: ReactNode; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-primary/10 text-primary" : "text-muted hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
      }`}
    >
      {children}
    </Link>
  );
}
