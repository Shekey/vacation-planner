import {
  Bell,
  CalendarDays,
  CalendarHeart,
  ChevronDown,
  ChevronsUpDown,
  CreditCard,
  History,
  House,
  Inbox,
  LayoutDashboard,
  Plus,
  Settings2,
  Sun,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "@/auth";
import { Breadcrumb, SidebarLink } from "@/components/app-shell";
import { BottomNav } from "@/components/bottom-nav";
import { NavLink } from "@/components/nav-link";
import { Avatar, LogoMark } from "@/components/ui";
import { db } from "@/lib/db";
import { getMessages } from "@/lib/i18n/server";
import { accessOf, isOverLimit, PLANS } from "@/lib/plans";
import { can } from "@/lib/permissions";
import { requireMembership, settingsOf } from "@/lib/session";

export default async function WorkspaceLayout({
  children,
  params,
}: LayoutProps<"/w/[slug]">) {
  const { slug } = await params;
  const { workspace, membership, user } = await requireMembership(slug);
  const settings = settingsOf(workspace);
  const isAdmin = membership.role === "ADMIN";
  // Approvers see Approvals; viewers have nothing to book (#77).
  const canDecide = can(membership.role, "bookings:decide") && settings.approvalsEnabled;
  const canBook = can(membership.role, "bookings:own") || can(membership.role, "bookings:manage-all");
  const pendingCount =
    canDecide
      ? await db.booking.count({
          where: { workspaceId: workspace.id, status: "PENDING" },
        })
      : 0;
  const base = `/w/${slug}`;
  const access = accessOf(workspace);
  const memberCount = await db.membership.count({
    where: { workspaceId: workspace.id, removedAt: null, isSample: false },
  });
  // Sample people count here: the sidebar describes the team as the calendar shows it.
  const teamSize = await db.membership.count({ where: { workspaceId: workspace.id, removedAt: null } });
  const overLimit = isOverLimit(access, memberCount);
  const trialEnding = access.kind === "trial" && access.trialDaysLeft <= 7;
  const { common, workspace: t } = await getMessages();

  const labels = {
    "": t.shell.home,
    calendar: t.shell.teamCalendar,
    people: t.nav.people,
    me: t.nav.me,
    holidays: t.nav.holidays,
    book: t.bookTimeOff,
    approvals: t.nav.approvals,
    members: t.nav.members,
    activity: t.nav.activity,
    settings: t.nav.settings,
    billing: t.nav.billing,
    admin: t.shell.adminOverview,
  };
  const userLabel = user.name ?? user.email;

  return (
    // The root layout hides its own header and footer around this shell (globals.css, `.app-shell`).
    <div className="app-shell min-h-dvh lg:grid lg:grid-cols-[216px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-7 overflow-y-auto border-r border-border bg-surface px-[18px] pt-[30px] pb-6 lg:flex">
        <Link href="/" className="flex items-center gap-2.5 text-base text-foreground">
          <LogoMark className="size-9" />
          {common.appName}
        </Link>
        <Link
          href="/"
          title={t.switchWorkspace}
          className="flex items-center gap-2 rounded-[10px] bg-surface-muted p-2.5 transition-colors hover:bg-border/60"
        >
          <span className="min-w-0 flex-1 leading-[1.45]">
            <span className="block truncate text-xs font-semibold">{workspace.name}</span>
            <span className="block truncate text-[11px] text-muted">{t.shell.members(teamSize)}</span>
          </span>
          <ChevronsUpDown aria-hidden className="size-3.5 shrink-0 text-muted" />
        </Link>
        <nav aria-label={t.navLabel} className="flex flex-col gap-6">
          <ul className="space-y-1.5">
            <li>
              <SidebarLink href={base} exact icon={<House aria-hidden />}>
                {t.shell.home}
              </SidebarLink>
            </li>
            <li>
              <SidebarLink href={`${base}/calendar`} icon={<CalendarDays aria-hidden />}>
                {t.shell.teamCalendar}
              </SidebarLink>
            </li>
            <li>
              <SidebarLink href={`${base}/me`} icon={<Sun aria-hidden />}>
                {t.nav.me}
              </SidebarLink>
            </li>
            <li>
              <SidebarLink href={`${base}/people`} icon={<Users aria-hidden />}>
                {t.nav.people}
              </SidebarLink>
            </li>
            <li>
              <SidebarLink href={`${base}/holidays`} icon={<CalendarHeart aria-hidden />}>
                {t.nav.holidays}
              </SidebarLink>
            </li>
          </ul>
          {(isAdmin || canDecide) && (
            <div className="space-y-2 border-t border-border pt-5">
              <p className="px-3 text-[11px] font-semibold tracking-wide text-muted uppercase">{t.shell.tools}</p>
              <ul className="space-y-0.5">
                {isAdmin && (
                  <li>
                    <SidebarLink href={`${base}/admin`} exact icon={<LayoutDashboard aria-hidden />}>
                      {t.shell.adminOverview}
                    </SidebarLink>
                  </li>
                )}
                {canDecide && (
                  <li>
                    <SidebarLink href={`${base}/approvals`} icon={<Inbox aria-hidden />}>
                      {t.nav.approvals}
                      {pendingCount > 0 && (
                        <span className="ml-1.5 rounded-full bg-warning-soft px-1.5 text-xs font-semibold text-warning">
                          {pendingCount}
                          <span className="sr-only">{t.waiting}</span>
                        </span>
                      )}
                    </SidebarLink>
                  </li>
                )}
                {isAdmin && (
                  <>
                    <li>
                      <SidebarLink href={`${base}/members`} icon={<UserCog aria-hidden />}>
                        {t.nav.members}
                      </SidebarLink>
                    </li>
                    <li>
                      <SidebarLink href={`${base}/activity`} icon={<History aria-hidden />}>
                        {t.nav.activity}
                      </SidebarLink>
                    </li>
                    <li>
                      <SidebarLink href={`${base}/settings`} icon={<Settings2 aria-hidden />}>
                        {t.nav.settings}
                      </SidebarLink>
                    </li>
                    <li>
                      <SidebarLink href={`${base}/billing`} icon={<CreditCard aria-hidden />}>
                        {t.nav.billing}
                      </SidebarLink>
                    </li>
                  </>
                )}
              </ul>
            </div>
          )}
        </nav>
        <div className="mt-auto border-t border-border pt-4">
          <ProfileMenu label={userLabel} hint={t.shell.profile} account={t.shell.account} signOutLabel={common.signOut} />
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-8 lg:h-20">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 lg:hidden" title={t.switchWorkspace}>
            <LogoMark className="size-8" />
            <span className="truncate text-sm font-semibold">{workspace.name}</span>
          </Link>
          <div className="hidden min-w-0 lg:block">
            <Breadcrumb base={base} workspace={workspace.name} labels={labels} />
          </div>
          <div className="flex shrink-0 items-center gap-4 sm:gap-5">
            <span className="hidden text-xs text-muted xl:inline">{workspace.timezone}</span>
            {canDecide && (
              <Link
                href={`${base}/approvals`}
                className="relative grid size-11 place-items-center rounded-full text-muted hover:bg-surface-muted hover:text-foreground"
                title={t.shell.requests(pendingCount)}
                aria-label={t.shell.requests(pendingCount)}
              >
                <Bell aria-hidden className="size-5" />
                {pendingCount > 0 && <span aria-hidden className="absolute top-2.5 right-2.5 size-2 rounded-full bg-warning" />}
              </Link>
            )}
            {canBook && (
              <Link href={`${base}/book`} className="btn hidden py-2 text-sm lg:inline-flex">
                <Plus aria-hidden className="size-4" /> {t.bookTimeOff}
              </Link>
            )}
            <div className="lg:hidden">
              <ProfileMenu label={userLabel} hint={t.shell.profile} account={t.shell.account} signOutLabel={common.signOut} compact />
            </div>
          </div>
        </header>

        <div id="workspace-content" className="flex-1 space-y-6 px-4 py-6 sm:px-8 sm:py-8">
          {/* Below the sidebar breakpoint: holidays and the admin pages the bottom bar has no room for. */}
          <nav aria-label={t.shell.tools} className="-mx-4 -mt-2 flex gap-1 overflow-x-auto px-4 pb-1 whitespace-nowrap sm:-mx-8 sm:px-8 lg:hidden">
            <NavLink href={`${base}/holidays`}>{t.nav.holidays}</NavLink>
            {isAdmin && <NavLink href={`${base}/admin`}>{t.shell.adminOverview}</NavLink>}
            {canDecide && (
                  <NavLink href={`${base}/approvals`}>
                    {t.nav.approvals}
                    {pendingCount > 0 && (
                      <span className="ml-1.5 rounded-full bg-warning-soft px-1.5 text-xs font-semibold text-warning">
                        {pendingCount}
                        <span className="sr-only">{t.waiting}</span>
                      </span>
                    )}
                  </NavLink>
            )}
            {isAdmin && (
              <>
                <NavLink href={`${base}/members`}>{t.nav.members}</NavLink>
                <NavLink href={`${base}/activity`}>{t.nav.activity}</NavLink>
                <NavLink href={`${base}/settings`}>{t.nav.settings}</NavLink>
                <NavLink href={`${base}/billing`}>{t.nav.billing}</NavLink>
              </>
            )}
          </nav>
      {overLimit && (
        <p
          role="status"
          className="rounded-[10px] bg-danger-soft p-4 text-sm"
        >
          {t.overLimit(access.name, access.maxMembers, memberCount)}{" "}
          {isAdmin ? (
            <Link
              href={`${base}/billing`}
              className="font-semibold text-primary-ink hover:underline"
            >
              {t.choosePlan}
            </Link>
          ) : (
            t.adminCanUpgrade
          )}
        </p>
      )}
      {isAdmin && !overLimit && trialEnding && (
        <p
          role="status"
          className="rounded-[10px] bg-warning-soft p-4 text-sm"
        >
          {t.trialEnds(access.trialDaysLeft)}{" "}
          {memberCount > PLANS.FREE.maxMembers
            ? t.trialAfterPaid
            : t.trialAfterFree}{" "}
          <Link
            href={`${base}/billing`}
            className="font-semibold text-primary-ink hover:underline"
          >
            {t.seePlans}
          </Link>
        </p>
      )}
          {children}
        </div>

        <footer className="border-t border-border px-4 sm:px-8">
          <nav
            aria-label={t.shell.legal}
            className="flex flex-wrap items-center gap-x-5 text-xs text-muted [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a:hover]:text-foreground [&_a:hover]:underline"
          >
            <span>{common.appName}</span>
            <Link href="/impressum">{common.footer.impressum}</Link>
            <Link href="/datenschutz">{common.footer.privacy}</Link>
            <Link href="/agb">{common.footer.terms}</Link>
            <Link href="/avv">{common.footer.dpa}</Link>
          </nav>
        </footer>
      </div>

      <BottomNav
        label={t.nav.mobileLabel}
        items={[
          {
            href: base,
            label: t.nav.short.overview,
            icon: "home",
            exact: true,
          },
          {
            href: `${base}/calendar`,
            label: t.nav.short.calendar,
            icon: "calendar",
          },
          ...(canBook
            ? [
                {
                  href: `${base}/book`,
                  label: t.nav.short.book,
                  icon: "plus" as const,
                  primary: true,
                  exact: true,
                },
              ]
            : []),
          { href: `${base}/people`, label: t.nav.short.people, icon: "people" },
          { href: `${base}/me`, label: t.nav.short.me, icon: "me" },
        ]}
      />
    </div>
  );
}

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/sign-in" });
}

/** Avatar with a small menu: profile and language, sign out. Opens upwards in the sidebar, downwards in the phone's top bar. */
function ProfileMenu({
  label,
  hint,
  account,
  signOutLabel,
  compact,
}: {
  label: string;
  hint: string;
  account: string;
  signOutLabel: string;
  compact?: boolean;
}) {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-[10px] py-1 hover:bg-surface-muted [&::-webkit-details-marker]:hidden">
        <Avatar label={label} className="size-9 text-xs" />
        {compact ? (
          <span className="sr-only">{hint}</span>
        ) : (
          <>
            <span className="min-w-0 flex-1 leading-[1.45]">
              <span className="block truncate text-[13px] font-semibold">{label}</span>
              <span className="block truncate text-[11px] text-muted">{hint}</span>
            </span>
            <ChevronDown aria-hidden className="size-3.5 shrink-0 text-muted transition-transform group-open:rotate-180" />
          </>
        )}
      </summary>
      <div
        className={`absolute z-40 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-lg ${
          compact ? "top-full right-0 mt-2" : "bottom-full left-0 mb-2"
        }`}
      >
        <Link href="/account" className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-surface-muted">
          {account}
        </Link>
        <form action={signOutAction}>
          <button className="flex min-h-11 w-full items-center rounded-lg px-3 text-sm text-muted hover:bg-surface-muted hover:text-foreground">
            {signOutLabel}
          </button>
        </form>
      </div>
    </details>
  );
}
