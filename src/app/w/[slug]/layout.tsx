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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold">{workspace.name}</h1>
          <Link href="/" className="text-sm underline opacity-70">
            Switch
          </Link>
        </div>
        <Link href={`${base}/book`} className="btn">
          Book time off
        </Link>
      </div>
      <nav className="-mx-1 flex flex-wrap gap-1 border-b border-black/10 pb-2 dark:border-white/15">
        <NavLink href={base} exact>
          Overview
        </NavLink>
        <NavLink href={`${base}/calendar`}>Calendar</NavLink>
        <NavLink href={`${base}/me`}>My time off</NavLink>
        {isAdmin && settings.approvalsEnabled && (
          <NavLink href={`${base}/approvals`}>
            Approvals
            {pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white">
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
