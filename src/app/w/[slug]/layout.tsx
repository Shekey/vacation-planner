import Link from "next/link";
import { NavLink } from "@/components/nav-link";
import { db } from "@/lib/db";
import { getMessages } from "@/lib/i18n/server";
import { accessOf, isOverLimit } from "@/lib/plans";
import { requireMembership, settingsOf } from "@/lib/session";

export default async function WorkspaceLayout({ children, params }: LayoutProps<"/w/[slug]">) {
  const { slug } = await params;
  const { workspace, membership } = await requireMembership(slug);
  const settings = settingsOf(workspace);
  const isAdmin = membership.role === "ADMIN";
  const pendingCount =
    isAdmin && settings.approvalsEnabled ? await db.booking.count({ where: { workspaceId: workspace.id, status: "PENDING" } }) : 0;
  const base = `/w/${slug}`;
  const access = accessOf(workspace);
  const memberCount = await db.membership.count({ where: { workspaceId: workspace.id, removedAt: null } });
  const overLimit = isOverLimit(access, memberCount);
  const trialEnding = access.kind === "trial" && access.trialDaysLeft <= 7;
  const { common, workspace: t } = await getMessages();

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
              {isAdmin ? common.admin : common.member} · {t.switchWorkspace}
            </Link>
          </div>
        </div>
        <Link href={`${base}/book`} className="btn shrink-0 whitespace-nowrap">
          <span aria-hidden>+</span> {t.bookTimeOff}
        </Link>
      </div>
      <nav
        aria-label={t.navLabel}
        className="-mx-4 flex gap-1 overflow-x-auto whitespace-nowrap border-b border-border px-3 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
      >
        <NavLink href={base} exact>
          {t.nav.overview}
        </NavLink>
        <NavLink href={`${base}/calendar`}>{t.nav.calendar}</NavLink>
        <NavLink href={`${base}/people`}>{t.nav.people}</NavLink>
        <NavLink href={`${base}/me`}>{t.nav.me}</NavLink>
        <NavLink href={`${base}/holidays`}>{t.nav.holidays}</NavLink>
        {isAdmin && settings.approvalsEnabled && (
          <NavLink href={`${base}/approvals`}>
            {t.nav.approvals}
            {pendingCount > 0 && (
              <span
                className="ml-1.5 rounded-full bg-amber-600 px-1.5 text-xs font-semibold text-white"
                aria-label={t.waitingAria(pendingCount)}
              >
                {pendingCount}
                <span className="sr-only">{t.waiting}</span>
              </span>
            )}
          </NavLink>
        )}
        {isAdmin && <NavLink href={`${base}/members`}>{t.nav.members}</NavLink>}
        {isAdmin && <NavLink href={`${base}/settings`}>{t.nav.settings}</NavLink>}
        {isAdmin && <NavLink href={`${base}/billing`}>{t.nav.billing}</NavLink>}
      </nav>
      {overLimit && (
        <p role="status" className="card border-red-500/40 bg-red-50 text-sm dark:bg-red-900/20">
          {t.overLimit(access.name, access.maxMembers, memberCount)}{" "}
          {isAdmin ? (
            <Link href={`${base}/billing`} className="font-medium text-primary hover:underline">
              {t.choosePlan}
            </Link>
          ) : (
            t.adminCanUpgrade
          )}
        </p>
      )}
      {isAdmin && !overLimit && trialEnding && (
        <p role="status" className="card border-amber-400/60 bg-amber-50 text-sm dark:bg-amber-900/20">
          {t.trialEnds(access.trialDaysLeft)} {memberCount > 5 ? t.trialAfterPaid : t.trialAfterFree}{" "}
          <Link href={`${base}/billing`} className="font-medium text-primary hover:underline">
            {t.seePlans}
          </Link>
        </p>
      )}
      {children}
    </div>
  );
}
