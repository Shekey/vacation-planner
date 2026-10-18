import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { isBetaMode } from "@/lib/beta";
import { formatDate, toISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { accessOf, isOverLimit } from "@/lib/plans";
import { supportAccessActive } from "@/lib/superadmin";
import { requireSuperAdmin } from "@/lib/superadmin-session";
import { restoreCutoff } from "@/lib/undo";
import { startPostBetaTrialAction } from "./actions";
import { MonitoringCheck } from "./monitoring-check";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).superadmin.title, robots: { index: false, follow: false } };
}

const DAY = 86_400_000;

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  await requireSuperAdmin();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 80) : "";
  const locale = await getLocale();
  const t = (await getMessages()).superadmin;
  const now = new Date();

  const [all, rows] = await Promise.all([
    db.workspace.findMany({
      select: { plan: true, billingStatus: true, trialEndsAt: true, createdAt: true, deletedAt: true },
    }),
    db.workspace.findMany({
      where: query
        ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { slug: { contains: query, mode: "insensitive" } }] }
        : undefined,
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        billingStatus: true,
        trialEndsAt: true,
        createdAt: true,
        deletedAt: true,
        supportAccessUntil: true,
        _count: { select: { memberships: { where: { removedAt: null, isSample: false } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const live = all.filter((w) => !w.deletedAt);
  const kinds = live.map((w) => accessOf(w, now));
  const stats = [
    [t.stats.workspaces, live.length],
    [t.stats.trials, kinds.filter((a) => a.kind === "trial").length],
    [t.stats.paid, kinds.filter((a) => a.kind === "paid").length],
    [t.stats.endingSoon, live.filter((w, i) => kinds[i].kind === "trial" && kinds[i].trialDaysLeft <= 7).length],
    [t.stats.newWeek, live.filter((w) => w.createdAt.getTime() > now.getTime() - 7 * DAY).length],
    [t.stats.newMonth, live.filter((w) => w.createdAt.getTime() > now.getTime() - 30 * DAY).length],
    [t.stats.deleted, all.filter((w) => w.deletedAt && w.deletedAt > restoreCutoff(now)).length],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="max-w-2xl text-sm text-muted">{t.intro}</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="card">
            <dt className="eyebrow">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      {!isBetaMode() && (
        <section className="card space-y-2">
          <h2 className="font-medium">{t.beta.heading}</h2>
          <p className="max-w-2xl text-sm text-muted">{t.beta.body}</p>
          <ActionForm action={startPostBetaTrialAction} confirm={t.beta.confirm}>
            <button className="btn-secondary">{t.beta.button}</button>
          </ActionForm>
        </section>
      )}

      <MonitoringCheck />

      <form className="flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={query} className="input max-w-sm" placeholder={t.search} aria-label={t.search} />
        <button className="btn-secondary">{t.searchButton}</button>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">{t.none}</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted">{t.showing(rows.length)}</p>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="p-3 font-medium">{t.columns.name}</th>
                  <th className="p-3 font-medium">{t.columns.plan}</th>
                  <th className="p-3 font-medium">{t.columns.people}</th>
                  <th className="p-3 font-medium">{t.columns.created}</th>
                  <th className="p-3 font-medium">{t.columns.status}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => {
                  const access = accessOf(w, now);
                  const people = w._count.memberships;
                  return (
                    <tr key={w.id} className="border-t border-border">
                      <td className="p-3">
                        <Link href={`/admin/workspaces/${w.id}`} className="font-medium text-primary hover:underline">
                          {w.name}
                        </Link>
                        <div className="text-xs text-muted">{w.slug}</div>
                      </td>
                      <td className="p-3">{access.kind === "trial" ? t.trialLeft(access.trialDaysLeft) : access.name}</td>
                      <td className="p-3">{people}</td>
                      <td className="p-3 whitespace-nowrap">
                        {formatDate(toISO(w.createdAt), { day: "numeric", month: "short", year: "numeric" }, locale)}
                      </td>
                      <td className="space-x-1 p-3">
                        {w.deletedAt && <Badge tone="red">{t.badges.deleted}</Badge>}
                        {supportAccessActive(w.supportAccessUntil, now) && <Badge tone="amber">{t.badges.support}</Badge>}
                        {isOverLimit(access, people) && <Badge tone="amber">{t.badges.overLimit}</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ tone, children }: { tone: "red" | "amber"; children: React.ReactNode }) {
  const color =
    tone === "red"
      ? "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200"
      : "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200";
  return <span className={`inline-block rounded px-1.5 py-px text-[11px] font-semibold ${color}`}>{children}</span>;
}
