import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { NavLink } from "@/components/nav-link";
import { db } from "@/lib/db";
import { getMessages } from "@/lib/i18n/server";
import { accessOf, isOverLimit, PLANS } from "@/lib/plans";
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
  const memberCount = await db.membership.count({ where: { workspaceId: workspace.id, removedAt: null, isSample: false } });
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
        <Link href={`${base}/book`} className="btn hidden shrink-0 whitespace-nowrap sm:inline-flex">
          <span aria-hidden>+</span> {t.bookTimeOff}
        </Link>
      </div>
      <nav
        aria-label={t.navLabel}
        className="-mx-4 flex items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-border px-3 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {/* Everyday pages; on phones the first four live in the bottom bar instead. */}
        <span className="hidden sm:contents">
          <NavLink href={base} exact>
            {t.nav.overview}
          </NavLink>
          <NavLink href={`${base}/calendar`}>{t.nav.calendar}</NavLink>
          <NavLink href={`${base}/people`}>{t.nav.people}</NavLink>
          <NavLink href={`${base}/me`}>{t.nav.me}</NavLink>
        </span>
        <NavLink href={`${base}/holidays`}>{t.nav.holidays}</NavLink>
        {isAdmin && (
          <>
            <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border sm:ml-auto sm:mr-1" />
            <span className="px-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{t.nav.admin}</span>
            {settings.approvalsEnabled && (
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
            <NavLink href={`${base}/members`}>{t.nav.members}</NavLink>
            <NavLink href={`${base}/activity`}>{t.nav.activity}</NavLink>
            <NavLink href={`${base}/settings`}>{t.nav.settings}</NavLink>
            <NavLink href={`${base}/billing`}>{t.nav.billing}</NavLink>
          </>
        )}
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
          {t.trialEnds(access.trialDaysLeft)} {memberCount > PLANS.FREE.maxMembers ? t.trialAfterPaid : t.trialAfterFree}{" "}
          <Link href={`${base}/billing`} className="font-medium text-primary hover:underline">
            {t.seePlans}
          </Link>
        </p>
      )}
      {children}
      <BottomNav
        label={t.nav.mobileLabel}
        items={[
          { href: base, label: t.nav.short.overview, icon: "home", exact: true },
          { href: `${base}/calendar`, label: t.nav.short.calendar, icon: "calendar" },
          { href: `${base}/book`, label: t.nav.short.book, icon: "plus", primary: true, exact: true },
          { href: `${base}/people`, label: t.nav.short.people, icon: "people" },
          { href: `${base}/me`, label: t.nav.short.me, icon: "me" },
        ]}
      />
    </div>
  );
}
