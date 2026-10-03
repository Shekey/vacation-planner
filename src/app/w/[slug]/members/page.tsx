import { ActionForm } from "@/components/action-form";
import { Avatar } from "@/components/ui";
import { defaultWorkDays } from "@/lib/booking-days";
import { formatDate, toISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { usingTestSender } from "@/lib/email";
import { regionsOf } from "@/lib/holiday-regions";
import type { Locale } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { requireAdmin } from "@/lib/session";
import {
  inviteAction,
  removeMemberAction,
  resendInviteAction,
  revokeInviteAction,
  updateMemberAction,
} from "./actions";

export async function generateMetadata() {
  return { title: (await getMessages()).members.title };
}

/** "Mon–Thu", "Mon, Wed, Fri" or null for the default. */
function workDaysLabel(days: number[], WEEKDAYS: readonly string[]): string | null {
  if (days.length === 0) return null;
  const contiguous = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  return contiguous && days.length > 2
    ? `${WEEKDAYS[days[0] - 1]}–${WEEKDAYS[days[days.length - 1] - 1]}`
    : days.map((d) => WEEKDAYS[d - 1]).join(", ");
}

export default async function MembersPage({ params }: PageProps<"/w/[slug]/members">) {
  const { slug } = await params;
  const { workspace, membership: me } = await requireAdmin(slug);
  const locale: Locale = await getLocale();
  const { members: t, common } = await getMessages();
  const WEEKDAYS = t.weekdays;

  const [members, invites] = await Promise.all([
    db.membership.findMany({
      where: { workspaceId: workspace.id, removedAt: null },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    db.invitation.findMany({
      where: { workspaceId: workspace.id, acceptedAt: null, revokedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const now = new Date();
  const regions = regionsOf(workspace.settings?.holidayCountry ?? "", locale);
  const defaultRegion = regions.find((r) => r.code === workspace.settings?.holidayRegion)?.name;
  const teamWorkDays = defaultWorkDays(workspace.settings?.countWeekends ?? false);

  return (
    <div className="space-y-8">
      <section className="card space-y-3">
        <h2 className="font-medium">{t.inviteHeading}</h2>
        {usingTestSender() && (
          <p role="alert" className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
            {t.testSender} <code>EMAIL_FROM</code> {t.testSenderEnd}
          </p>
        )}
        <ActionForm action={inviteAction.bind(null, slug)} className="space-y-3" resetOnSuccess>
          <textarea
            name="emails"
            aria-label={t.emailsLabel}
            className="input"
            rows={3}
            required
            placeholder={t.emailsPlaceholder}
          />
          <div className="flex flex-wrap items-center gap-3">
            <select name="role" className="input w-auto" defaultValue="MEMBER" aria-label={t.inviteAs}>
              <option value="MEMBER">{t.asMembers}</option>
              <option value="ADMIN">{t.asAdmins}</option>
            </select>
            <button className="btn">{t.sendInvites}</button>
          </div>
        </ActionForm>
        <p className="text-xs opacity-60">
          {t.inviteHint}
        </p>
      </section>

      {invites.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{t.pendingHeading}</h2>
          <ul className="divide-y divide-black/5 dark:divide-white/10">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  {i.email} <span className="opacity-60">· {i.role === "ADMIN" ? t.roleAdmin : t.roleMember}</span>
                  {i.expiresAt < now && <span className="ml-2 text-red-600">{t.expired}</span>}
                </span>
                <span className="flex gap-3">
                  <ActionForm action={resendInviteAction.bind(null, slug, i.id)}>
                    <button className="text-primary hover:underline">{t.resend}</button>
                  </ActionForm>
                  <ActionForm action={revokeInviteAction.bind(null, slug, i.id)}>
                    <button className="text-red-600 hover:underline">{t.revoke}</button>
                  </ActionForm>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card space-y-2">
        <h2 className="font-medium">{t.membersHeading(members.length)}</h2>
        <ul className="divide-y divide-border">
          {members.map((m) => {
            const who = m.user.name ?? m.user.email;
            const partTime = workDaysLabel(m.workDays, WEEKDAYS);
            const started = m.employmentStart ? toISO(m.employmentStart) : "";
            const workDays = m.workDays.length ? m.workDays : teamWorkDays;
            return (
            <li key={m.id} id={`member-${m.id}`} className="flex scroll-mt-20 flex-wrap items-center justify-between gap-3 rounded-lg py-3 target:-mx-2 target:px-2 target:bg-primary/10">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar label={who} seed={m.user.email} className="size-9 text-sm" />
                <div className="min-w-0">
                  <div className="font-medium">
                    {who}
                    {m.id === me.id && <span className="font-normal opacity-60"> {t.you}</span>}
                  </div>
                  {m.user.name && <div className="truncate text-sm opacity-60">{m.user.email}</div>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <ActionForm action={updateMemberAction.bind(null, slug, m.id)} className="flex flex-wrap items-center gap-2 text-sm">
                  <select name="role" defaultValue={m.role} className="input w-auto py-1" aria-label={t.roleFor(who)}>
                    <option value="MEMBER">{common.member}</option>
                    <option value="ADMIN">{common.admin}</option>
                  </select>
                  <label className="flex items-center gap-1">
                    <input
                      name="allowance"
                      type="number"
                      min={0}
                      max={365}
                      step={0.5}
                      defaultValue={m.annualAllowanceDays === null ? "" : Number(m.annualAllowanceDays)}
                      placeholder="–"
                      className="input w-20 py-1"
                      aria-label={t.allowanceFor(who)}
                    />
                    <span className="opacity-60">{t.daysPerYear}</span>
                  </label>
                  {regions.length > 0 && (
                    <select
                      name="region"
                      defaultValue={m.holidayRegion ?? ""}
                      className="input w-auto max-w-48 py-1"
                      aria-label={t.regionFor(who)}
                    >
                      <option value="">{defaultRegion ? t.teamDefault(defaultRegion) : t.nationwideOnly}</option>
                      {regions.map((r) => (
                        <option key={r.code} value={r.code}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button className="btn-secondary px-3 py-1" aria-label={t.saveFor(who)}>
                    {t.save}
                  </button>
                  <details className="w-full">
                    <summary className="cursor-pointer text-xs text-muted">
                      {[partTime ? t.works(partTime) : t.workDays, started ? t.started(formatDate(started, { day: "numeric", month: "short", year: "numeric" }, locale)) : t.startDate].join(" · ")}
                    </summary>
                    <div className="mt-2 space-y-2">
                      <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <legend className="sr-only">{t.daysWorks(who)}</legend>
                        {WEEKDAYS.map((label, i) => (
                          <label key={label} className="flex items-center gap-1">
                            <input type="checkbox" name="workDays" value={i + 1} defaultChecked={workDays.includes(i + 1)} />
                            {label}
                          </label>
                        ))}
                      </fieldset>
                      <label className="flex flex-wrap items-center gap-2">
                        <span className="opacity-60">{t.startedOn}</span>
                        <input
                          name="employmentStart"
                          type="date"
                          defaultValue={started}
                          className="input w-auto py-1"
                          aria-label={t.firstDayOf(who)}
                        />
                      </label>
                      <p className="text-xs opacity-60">
                        {t.workDaysHint}
                      </p>
                    </div>
                  </details>
                </ActionForm>
                {m.id !== me.id && (
                  <ActionForm
                    action={removeMemberAction.bind(null, slug, m.id)}
                    confirm={t.removeConfirm(who)}
                  >
                    <button className="rounded-lg px-2 py-1 text-sm text-red-600 hover:bg-red-500/10" aria-label={t.removeLabel(who)}>
                      {t.remove}
                    </button>
                  </ActionForm>
                )}
              </div>
            </li>
            );
          })}
        </ul>
        <p className="text-xs opacity-60">{t.allowanceHint}</p>
      </section>
    </div>
  );
}
