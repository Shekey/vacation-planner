import Link from "next/link";
import { NavLink } from "@/components/nav-link";
import { db } from "@/lib/db";
import { requireMembership, settingsOf } from "@/lib/session";

export default async function WorkspaceLayout({ children, params }: LayoutProps<"/w/[slug]">) {
  const { slug } = await params;
  const { workspace, membership } = await requireMembership(slug);
  const settings = settingsOf(workspace);
  const isAdmin = membership.role === "ADMIN";
  const pendingCount =
    isAdmin && settings.approvalsEnabled
      ? await db.booking.count({ where: { workspaceId: workspace.id, status: "PENDING" } })
      : 0;
  const base = `/w/${slug}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="hidden size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-teal-500 text-lg font-semibold text-white shadow-sm sm:grid"
          >
            {workspace.name.trim()[0]?.toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{workspace.name}</h1>
            <Link href="/" className="text-sm text-muted hover:text-foreground hover:underline">
              {isAdmin ? "Admin" : "Member"} · Switch workspace
            </Link>
          </div>
        </div>
        <Link href={`${base}/book`} className="btn shrink-0 whitespace-nowrap">
          <span aria-hidden>+</span> Book time off
        </Link>
      </div>
      <nav
        aria-label="Workspace"
        className="-mx-4 flex gap-1 overflow-x-auto whitespace-nowrap border-b border-border px-3 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
      >
        <NavLink href={base} exact>
          Overview
        </NavLink>
        <NavLink href={`${base}/calendar`}>Calendar</NavLink>
        <NavLink href={`${base}/people`}>People</NavLink>
        <NavLink href={`${base}/me`}>My time off</NavLink>
        <NavLink href={`${base}/holidays`}>Holidays</NavLink>
        {isAdmin && settings.approvalsEnabled && (
          <NavLink href={`${base}/approvals`}>
            Approvals
            {pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white" aria-label={`${pendingCount} waiting`}>
                {pendingCount}
              </span>
            )}
          </NavLink>
        )}
        {isAdmin && <NavLink href={`${base}/members`}>Members</NavLink>}
        {isAdmin && <NavLink href={`${base}/settings`}>Settings</NavLink>}
      </nav>
      {children}
    </div>
  );
}
