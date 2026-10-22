"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** A sidebar entry: icon and label, tinted when it is the current page. */
export function SidebarLink({
  href,
  icon,
  exact,
  children,
}: {
  href: string;
  icon: ReactNode;
  exact?: boolean;
  children: ReactNode;
}) {
  const active = isActive(usePathname(), href, exact);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] transition-colors [&_svg]:size-5 [&_svg]:shrink-0 ${
        active ? "bg-primary-soft font-semibold text-primary-ink" : "text-muted hover:bg-surface-muted hover:text-foreground"
      }`}
    >
      {icon}
      <span className="min-w-0 flex-1">{children}</span>
    </Link>
  );
}

/** "Workspace / Page" in the top bar; the page name comes from the first path segment after the workspace. */
export function Breadcrumb({ base, workspace, labels }: { base: string; workspace: string; labels: Record<string, string> }) {
  const segment = usePathname().slice(base.length).split("/")[1] ?? "";
  const page = labels[segment];
  return (
    <p className="min-w-0 truncate text-[13px] text-muted">
      {workspace}
      {page && (
        <>
          <span aria-hidden className="px-2">
            /
          </span>
          <span className="text-foreground">{page}</span>
        </>
      )}
    </p>
  );
}
