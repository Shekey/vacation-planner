import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { formatDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { accessOf } from "@/lib/plans";
import { supportAccessActive, TRIAL_EXTEND_MAX_DAYS } from "@/lib/superadmin";
import { loadSupportView, logSupportAccess } from "@/lib/support-view";
import { requireSuperAdmin } from "@/lib/superadmin-session";
import { canRestore } from "@/lib/undo";
import { extendTrialAction, restoreWorkspaceAsOperatorAction } from "../../actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).superadmin.title, robots: { index: false, follow: false } };
}

export default async function AdminWorkspacePage({ params }: PageProps<"/admin/workspaces/[id]">) {
  const operator = await requireSuperAdmin();
  const { id } = await params;
  const ws = await db.workspace.findUnique({
    where: { id },
    include: {
      settings: { select: { approvalsEnabled: true, holidayCountry: true, teamsWebhookUrl: true, slackWebhookUrl: true } },
      _count: { select: { memberships: { where: { removedAt: null, isSample: false } } } },
    },
  });
  if (!ws) notFound();
  const locale = await getLocale();
  const { superadmin: t } = await getMessages();
  const when = (d: Date | null) => (d ? formatDateTime(d, locale, ws.timezone) : t.detail.none);
  const access = accessOf(ws);
  const supportOn = supportAccessActive(ws.supportAccessUntil);

  // Contact data of the account holders: always visible, the operator is the controller for admin accounts.
  const admins = await db.membership.findMany({
    where: { workspaceId: ws.id, role: "ADMIN", removedAt: null, isSample: false },
    include: { user: { select: { name: true, email: true } } },
  });

  // The support view shows members, never time off, and only while the customer's admin allows it.
  let support: Awaited<ReturnType<typeof loadSupportView>> | null = null;
  if (supportOn) {
    support = await loadSupportView(ws.id);
    await logSupportAccess(ws.id, operator.id);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Link href="/admin" className="text-sm text-muted hover:text-foreground hover:underline">
          {t.back}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{ws.name}</h1>
        <p className="text-sm text-muted">{ws.slug}</p>
      </div>

      {ws.deletedAt && (
        <section className="card flex flex-wrap items-center justify-between gap-3 border-red-500/40">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{t.detail.deletedAt(when(ws.deletedAt))}</p>
          {canRestore(ws.deletedAt) && (
            <ActionForm action={restoreWorkspaceAsOperatorAction.bind(null, ws.id)} confirm={t.detail.restoreConfirm}>
              <button className="btn-secondary">{t.detail.restore}</button>
            </ActionForm>
          )}
        </section>
      )}

      <section className="card">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Item label={t.detail.plan}>{access.kind === "trial" ? t.trialLeft(access.trialDaysLeft) : access.name}</Item>
          <Item label={t.detail.billing}>{ws.billingStatus ?? t.detail.none}</Item>
          <Item label={t.detail.trialEnds}>{when(ws.trialEndsAt)}</Item>
          <Item label={t.detail.created}>{when(ws.createdAt)}</Item>
          <Item label={t.detail.people}>
            {ws._count.memberships} / {access.maxMembers}
          </Item>
          <Item label={t.detail.stripe}>{ws.stripeCustomerId ?? t.detail.none}</Item>
          <Item label={t.beta.founder}>{ws.founderRate ? t.support.yes : t.support.no}</Item>
          <Item label={t.detail.admins}>
            {admins.map((a) => (
              <div key={a.id}>
                {a.user.name ? `${a.user.name} · ` : ""}
                <a href={`mailto:${a.user.email}`} className="text-primary hover:underline">
                  {a.user.email}
                </a>
              </div>
            ))}
          </Item>
        </dl>
      </section>

      <section className="card space-y-3">
        <h2 className="font-medium">{t.detail.extendHeading}</h2>
        <ActionForm action={extendTrialAction.bind(null, ws.id)} className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm">
            <span className="block">{t.detail.extendDays}</span>
            <input name="days" type="number" min={1} max={TRIAL_EXTEND_MAX_DAYS} defaultValue={14} className="input w-24" required />
          </label>
          <button className="btn-secondary">{t.detail.extendButton}</button>
        </ActionForm>
      </section>

      <section className="card space-y-3">
        <h2 className="font-medium">{t.support.heading}</h2>
        {!support ? (
          <p className="text-sm text-muted">{t.support.off}</p>
        ) : (
          <>
            <p className="text-sm font-medium">{t.support.on(when(ws.supportAccessUntil))}</p>
            <div>
              <h3 className="text-sm font-medium">{t.support.members}</h3>
              <ul className="divide-y divide-border text-sm">
                {support.members.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                    <span>
                      {m.user.name ? `${m.user.name} · ` : ""}
                      {m.user.email}
                    </span>
                    <span className="text-xs text-muted">
                      {[m.role, m.removedAt ? t.support.removed : null, m.isSample ? t.support.sample : null].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-sm">
              <h3 className="font-medium">{t.support.bookings}</h3>
              <p className="text-muted">{support.bookings.map(([status, n]) => `${status}: ${n}`).join(" · ") || t.detail.none}</p>
            </div>
            <div className="text-sm">
              <h3 className="font-medium">{t.support.settings}</h3>
              <p className="text-muted">
                {t.support.approvals}: {ws.settings?.approvalsEnabled ? t.support.yes : t.support.no} · {t.support.chat}:{" "}
                {ws.settings?.teamsWebhookUrl || ws.settings?.slackWebhookUrl ? t.support.yes : t.support.no} · {t.support.holidays}:{" "}
                {ws.settings?.holidayCountry ?? t.detail.none}
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
