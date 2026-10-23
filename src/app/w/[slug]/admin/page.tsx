import { AlertTriangle, ArrowRight, CreditCard, History, Plus, Settings2, Sparkles, Sun, Users, Clock3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/badges";
import { Avatar } from "@/components/ui";
import { activeBookingsBetween, allowanceSummary, approvalsInUse, loadHolidays, regionOf, spanOf, withDays } from "@/lib/bookings";
import { addDays, formatDate, formatRange, isoWeekday, partOfDay, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { accessOf, isOverLimit } from "@/lib/plans";
import { requireAdmin, settingsOf } from "@/lib/session";
import { peopleOff } from "@/lib/staffing";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).adminOverview.title };
}

const card = "rounded-[18px] border border-border bg-surface p-5 sm:p-6";

export default async function AdminOverviewPage({ params }: PageProps<"/w/[slug]/admin">) {
  const { slug } = await params;
  const { workspace, membership, user } = await requireAdmin(slug);
  const locale = await getLocale();
  const { overview, adminOverview: t, workspace: w } = await getMessages();
  const fmt = (n: number) => formatNumber(n, locale);
  const settings = settingsOf(workspace);
  const today = todayIn(workspace.timezone);
  const base = `/w/${slug}`;
  const weekStart = addDays(today, 1 - isoWeekday(today));
  const weekEnd = addDays(weekStart, 4);
  const year = Number(today.slice(0, 4));
  const access = accessOf(workspace);

  const [pendingRaw, members, weekBookings, summary] = await Promise.all([
    approvalsInUse(settings)
      ? db.booking.findMany({
          where: { workspaceId: workspace.id, status: "PENDING", membership: { removedAt: null } },
          include: { membership: { include: { user: { select: { name: true, email: true } } } } },
          orderBy: { startDate: "asc" },
        })
      : [],
    db.membership.count({ where: { workspaceId: workspace.id, removedAt: null } }),
    activeBookingsBetween(workspace.id, weekStart, weekEnd),
    loadHolidays(workspace.id, regionOf(membership, settings)).then((h) => allowanceSummary(membership, settings, year, h, today)),
  ]);
  const pending = await withDays(workspace.id, settings, pendingRaw);
  const real = await db.membership.count({ where: { workspaceId: workspace.id, removedAt: null, isSample: false } });

  // Coverage this week (Mon–Fri): the thinnest day with confirmed time off only, and with pending requests too.
  const spans = (list: typeof weekBookings) => list.map((b) => ({ ...spanOf(b), membershipId: b.membershipId }));
  const confirmed = spans(weekBookings.filter((b) => b.status === "APPROVED"));
  const all = spans(weekBookings);
  const weekDays = [0, 1, 2, 3, 4].map((i) => addDays(weekStart, i));
  const inOn = (d: string, list: typeof all) => Math.max(0, members - peopleOff(list, d));
  const worst = weekDays.reduce((a, d) => (inOn(d, confirmed) < inOn(a, confirmed) ? d : a), weekDays[0]);
  const min = settings.minPeoplePresent;
  const risky = min === null ? null : weekDays.find((d) => inOn(d, all) < min && inOn(d, confirmed) >= min);

  const planValue = access.kind === "beta" ? "Free beta" : access.name;
  const planNote = isOverLimit(access, real) ? t.planOver : access.kind === "trial" ? t.planTrial(access.trialDaysLeft) : t.planIncluded(members);
  const queue = pending.filter((b) => b.membershipId !== membership.id).slice(0, 3);
  const own = pending.length - pending.filter((b) => b.membershipId !== membership.id).length;
  const name = (b: (typeof pending)[number]) => b.membership.user.name ?? b.membership.user.email;
  const firstName = (user.name ?? "").split(" ")[0];
  const link = "inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-primary-ink hover:underline [&_svg]:size-3.5";

  const stat = (label: string, value: string, note: string, icon: React.ReactNode) => (
    <div className={`${card} space-y-3`}>
      <div className="flex items-center justify-between text-[13px] text-muted">
        <span>{label}</span>
        <span aria-hidden className="text-primary-ink [&_svg]:size-[18px]">
          {icon}
        </span>
      </div>
      <p className="text-4xl leading-none">{value}</p>
      <p className="text-xs text-muted">{note}</p>
    </div>
  );

  const tools = [
    { href: "members", icon: <Users aria-hidden />, title: w.nav.members, hint: t.membersHint(members) },
    { href: "settings", icon: <Settings2 aria-hidden />, title: w.nav.settings, hint: t.settingsHint },
    { href: "activity", icon: <History aria-hidden />, title: w.nav.activity, hint: t.activityHint },
    { href: "billing", icon: <CreditCard aria-hidden />, title: w.nav.billing, hint: t.billingHint },
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <p className="text-xs tracking-wide text-muted uppercase">{t.eyebrow}</p>
          <h1 className="text-[28px] leading-tight font-normal tracking-tight sm:text-[32px]">{t.title}</h1>
          <p className="text-[15px] text-muted">
            {overview.greeting[partOfDay(workspace.timezone)]}
            {firstName ? `, ${firstName}` : ""}. {t.attention}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stat(
          t.pending,
          approvalsInUse(settings) ? fmt(pending.length) : "–",
          !approvalsInUse(settings) ? t.approvalsOff : pending.length === 0 ? t.nothingToReview : `${t.toReview(pending.length - own)}${own ? ` · ${own} ${locale === "de" ? "von dir" : "is yours"}` : ""}`,
          <Clock3 />,
        )}
        {stat(t.membersTitle, fmt(members), t.manageDirectory, <Users />)}
        {stat(t.plan, planValue, planNote, <Sparkles />)}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section aria-labelledby="queue" className={`${card} space-y-4`}>
          <div className="flex items-center justify-between gap-3">
            <h2 id="queue" className="text-lg">
              {t.queue}
            </h2>
            {approvalsInUse(settings) && (
              <Link href={`${base}/approvals`} className={link}>
                {t.allApprovals} <ArrowRight aria-hidden />
              </Link>
            )}
          </div>
          {queue.length === 0 && <p className="text-sm text-muted">{t.queueEmpty}</p>}
          <ul className="divide-y divide-border">
            {queue.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 py-4 first:pt-0">
                <Avatar label={name(b)} className="size-10 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{name(b)}</p>
                  <p className="text-xs text-muted">
                    {formatRange(spanOf(b).start, spanOf(b).end, locale)} · {t.workingDays(String(b.days))}
                  </p>
                </div>
                <StatusBadge status="PENDING" locale={locale} />
                <Link href={`${base}/approvals`} className="btn-secondary min-h-11 px-4 py-2 text-[13px] text-primary-ink">
                  {t.review}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-4">
          <section aria-labelledby="coverage" className={`${card} space-y-4`}>
            <div className="space-y-1">
              <h2 id="coverage" className="text-lg">
                {t.coverage}
              </h2>
              <p className="text-xs tracking-wide text-muted uppercase">
                {formatRange(weekStart, weekEnd, locale)}
              </p>
            </div>
            <p className="flex items-baseline gap-2 text-[32px] leading-tight">
              {t.inOfTotal(fmt(inOn(worst, confirmed)), fmt(members))} <span className="text-sm text-muted">{t.confirmedIn}</span>
            </p>
            <p className="text-xs text-muted">{min === null ? t.noMinimum : t.minimum(min)}</p>
            {risky && min !== null && (
              <div className="flex items-start gap-3 rounded-[10px] bg-warning-soft p-4 text-sm text-warning">
                <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold">{t.advisoryTitle}</p>
                  <p className="text-foreground">{t.advisory(formatDate(risky, { weekday: "long", day: "numeric", month: "long" }, locale), fmt(inOn(risky, all)), min)}</p>
                </div>
              </div>
            )}
            <Link href={`${base}/calendar`} className={link}>
              {t.openCalendar} <ArrowRight aria-hidden />
            </Link>
          </section>

          <section className="space-y-3 rounded-[18px] bg-primary-soft p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-primary-ink">
              <Sun aria-hidden className="size-[18px]" /> {t.yourTimeOff}
            </h2>
            <p className="text-sm text-primary-ink">{t.yourTimeOffBody(summary.allowance)}</p>
            <Link href={`${base}/book`} className="btn-secondary min-h-11 px-4 py-2 text-[13px] text-primary-ink">
              <Plus aria-hidden className="size-4" /> {t.requestTimeOff}
            </Link>
          </section>
        </div>
      </div>

      <section aria-labelledby="manage" className="space-y-4">
        <h2 id="manage" className="text-xl">
          {t.manage(workspace.name)}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tools.map((x) => (
            <li key={x.href}>
              <Link href={`${base}/${x.href}`} className="card-link block rounded-[18px] border border-border bg-surface p-[18px]">
                <span className="flex items-center gap-2.5 text-sm font-semibold">
                  <span aria-hidden className="text-primary-ink [&_svg]:size-[18px]">
                    {x.icon}
                  </span>
                  {x.title}
                  <ArrowRight aria-hidden className="ml-auto size-4 text-primary-ink" />
                </span>
                <span className="mt-2 block text-xs text-muted">{x.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
