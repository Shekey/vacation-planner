import { Check, ChevronRight, Hash, Info, MessageSquare, TriangleAlert } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import Link from "next/link";
import { intlLocale, isLocale, LOCALE_NAMES, LOCALES } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { accessOf } from "@/lib/plans";
import { requireAdmin, settingsOf } from "@/lib/session";
import { formatDateTime } from "@/lib/dates";
import {
  deleteWorkspaceAction,
  saveSettingsAction,
  sendTestPostAction,
} from "./actions";
import { SupportAccess } from "./support-access";

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
  on,
  off,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
  on: string;
  off: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-4">
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <span className="flex w-11 shrink-0 flex-col items-center gap-1">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
        <span className="relative h-6 w-10 rounded-full bg-border transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2" />
        <span aria-hidden className="text-[10px] font-semibold text-muted peer-checked:hidden">
          {off}
        </span>
        <span aria-hidden className="hidden text-[10px] font-semibold text-primary-ink peer-checked:block">
          {on}
        </span>
      </span>
    </label>
  );
}

const card = "space-y-4 rounded-[18px] border border-border bg-surface p-5 sm:p-6";
const cardTitle = "text-[17px] font-semibold";
const field = "block space-y-1.5";
const label = "text-xs font-semibold";
const hint = "block text-xs text-muted";
const input = "input min-h-11 rounded-[10px] text-sm";

export async function generateMetadata() {
  return { title: (await getMessages()).settings.title };
}

export default async function SettingsPage({
  params,
}: PageProps<"/w/[slug]/settings">) {
  const { slug } = await params;
  const { workspace } = await requireAdmin(slug);
  const settings = settingsOf(workspace);
  const t = (await getMessages()).settings;
  const leaveTypesText = (await getMessages()).leaveTypes;
  const locale = workspace.settings?.locale;
  const [expiryMonth, expiryDay] = settings.carryOverExpiry
    ? settings.carryOverExpiry.split("-")
    : ["", ""];
  const uiLocale = await getLocale();
  const months = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(intlLocale(uiLocale), {
      month: "long",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2026, i, 1))),
  );
  // The raw values, so saving on a plan without chat doesn't wipe the webhooks.
  const teamsWebhookUrl = workspace.settings?.teamsWebhookUrl ?? "";
  const slackWebhookUrl = workspace.settings?.slackWebhookUrl ?? "";
  const chat = accessOf(workspace).chat;
  const defaultAllowance = workspace.settings?.defaultAllowanceDays;
  const timezones = [
    "UTC",
    ...Intl.supportedValuesOf("timeZone").filter((tz) => tz !== "UTC"),
  ];

  return (
    <div className="space-y-6">
      <ActionForm action={saveSettingsAction.bind(null, slug)} className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{t.eyebrow}</p>
            <h1 className="text-[28px] leading-tight font-medium sm:text-[32px]">{t.title}</h1>
            <p className="text-sm text-muted">{t.subtitle}</p>
          </div>
          <button className="btn min-h-11 gap-2 rounded-[10px] px-4 text-[13px]">
            <Check aria-hidden className="size-4" /> {t.saveChanges}
          </button>
        </div>

        <div className="flex gap-2.5 rounded-[10px] bg-primary-soft p-4 text-primary-ink">
          <Info aria-hidden className="mt-0.5 size-[18px] shrink-0" />
          <div className="space-y-1">
            <p className="text-[13px] font-semibold">{t.notice.title}</p>
            <p className="text-xs">{t.notice.body(workspace.name)}</p>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="min-w-0 space-y-6">
            <section className={card} aria-labelledby="ws-title">
              <h2 id="ws-title" className={cardTitle}>
                {t.cards.workspace}
              </h2>
              <label className={field}>
                <span className={label}>{t.workspaceName}</span>
                <input name="name" className={input} defaultValue={workspace.name} required minLength={2} maxLength={60} />
              </label>
              <label className={field}>
                <span className={label}>{t.timezone}</span>
                <select name="timezone" className={input} defaultValue={workspace.timezone}>
                  {timezones.map((tz) => (
                    <option key={tz}>{tz}</option>
                  ))}
                </select>
                <span className={hint}>{t.timezoneHint}</span>
              </label>
              <label className={field}>
                <span className={label}>{t.language}</span>
                <select name="locale" className={input} defaultValue={isLocale(locale) ? locale : "en"}>
                  {LOCALES.map((l) => (
                    <option key={l} value={l}>
                      {LOCALE_NAMES[l]}
                    </option>
                  ))}
                </select>
                <span className={hint}>{t.languageHint}</span>
              </label>
            </section>

            <section className={card} aria-labelledby="allowance-title">
              <h2 id="allowance-title" className={cardTitle}>
                {t.cards.allowance}
              </h2>
              <label className={field}>
                <span className={label}>{t.defaultAllowance}</span>
                <input
                  name="defaultAllowance"
                  type="number"
                  min={0}
                  max={365}
                  step={0.5}
                  className={input}
                  defaultValue={defaultAllowance == null ? "" : Number(defaultAllowance)}
                />
                <span className={hint}>{t.defaultAllowanceHint}</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2.5 text-[13px]">
                <input type="checkbox" name="applyAllowanceToAll" className="mt-0.5" />
                {t.applyToAll}
              </label>
              <hr className="border-border" />
              <label className={field}>
                <span className={label}>{t.carryOver}</span>
                <input
                  name="maxCarryOver"
                  type="number"
                  min={0}
                  max={365}
                  step={0.5}
                  className={input}
                  defaultValue={settings.maxCarryOverDays ?? ""}
                  placeholder={t.carryOverPlaceholder}
                />
                <span className={hint}>{t.carryOverHint}</span>
              </label>
              <fieldset className="space-y-1.5">
                <legend className={label}>{t.expiry.legend}</legend>
                <div className="flex gap-2">
                  <label className="sr-only" htmlFor="carryOverExpiryDay">
                    {t.expiry.day}
                  </label>
                  <input
                    id="carryOverExpiryDay"
                    name="carryOverExpiryDay"
                    type="number"
                    min={1}
                    max={31}
                    step={1}
                    className={`${input} w-24`}
                    defaultValue={expiryDay ? Number(expiryDay) : ""}
                    placeholder="31"
                  />
                  <label className="sr-only" htmlFor="carryOverExpiryMonth">
                    {t.expiry.month}
                  </label>
                  <select id="carryOverExpiryMonth" name="carryOverExpiryMonth" className={`${input} flex-1`} defaultValue={expiryMonth}>
                    <option value="">{t.expiry.never}</option>
                    {months.map((m, i) => (
                      <option key={m} value={String(i + 1).padStart(2, "0")}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <span className={hint}>{t.expiry.hint}</span>
              </fieldset>
              <Link
                href={`/w/${slug}/members`}
                className="flex min-h-11 items-center justify-between gap-3 border-t border-border pt-3 hover:text-primary-ink"
              >
                <span className="space-y-1">
                  <span className="block text-[13px] font-semibold">{t.individual.title}</span>
                  <span className="block text-xs text-muted">{t.individual.body}</span>
                </span>
                <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
              </Link>
            </section>
          </div>

          <div className="min-w-0 space-y-6">
            <section className={card} aria-labelledby="rules-title">
              <h2 id="rules-title" className={cardTitle}>
                {t.cards.rules}
              </h2>
              <Toggle
                name="approvalsEnabled"
                label={t.approvals}
                hint={t.approvalsHint}
                defaultChecked={settings.approvalsEnabled}
                on={t.on}
                off={t.off}
              />
              {settings.approvalsEnabled && (
                <div className="flex gap-2.5 rounded-[10px] bg-warning-soft p-4 text-warning">
                  <TriangleAlert aria-hidden className="mt-0.5 size-[18px] shrink-0" />
                  <div className="space-y-1">
                    <p className="text-[13px] font-semibold">{t.approvalsWarn.title}</p>
                    <p className="text-xs">{t.approvalsWarn.body}</p>
                  </div>
                </div>
              )}
              {/* Only matters with approvals on, but kept in the form so turning approvals off doesn't lose them. */}
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["reminderDays", t.reminderDays, t.reminderHint, workspace.settings?.reminderDays],
                    ["autoApproveDays", t.autoApproveDays, t.autoApproveHint, workspace.settings?.autoApproveDays],
                  ] as const
                ).map(([name, text, help, value]) => (
                  <label key={name} className={field}>
                    <span className={label}>{text}</span>
                    <span className="flex items-center gap-2">
                      <input name={name} type="number" min={1} max={60} step={1} className={`${input} w-24`} defaultValue={value ?? ""} />
                      <span className={hint}>{t.daysUnit}</span>
                    </span>
                    <span className={hint}>{help}</span>
                  </label>
                ))}
              </div>
              <label className={field}>
                <span className={`${label} block`}>{t.overAllowance}</span>
                <select name="overAllowance" defaultValue={settings.overAllowance} className={input}>
                  {(["WARN", "APPROVAL", "BLOCK"] as const).map((p) => (
                    <option key={p} value={p}>
                      {t.overAllowanceOption[p]}
                    </option>
                  ))}
                </select>
                <span className={hint}>{t.overAllowanceHint}</span>
              </label>
              <hr className="border-border" />
              <Toggle name="allowHalfDays" label={t.halfDays} hint={t.halfDaysHint} defaultChecked={settings.allowHalfDays} on={t.on} off={t.off} />
              <hr className="border-border" />
              <Toggle name="countWeekends" label={t.weekends} hint={t.weekendsHint} defaultChecked={settings.countWeekends} on={t.on} off={t.off} />
              <hr className="border-border" />
              <label className={field}>
                <span className={label}>{t.minPeople}</span>
                <input
                  name="minPeoplePresent"
                  type="number"
                  min={1}
                  step={1}
                  className={input}
                  defaultValue={settings.minPeoplePresent ?? ""}
                  placeholder={t.minPeoplePlaceholder}
                />
                <span className={hint}>{t.minPeopleHint}</span>
              </label>
            </section>

            <section className={card} aria-labelledby="integrations-title">
              <h2 id="integrations-title" className={cardTitle}>
                {t.cards.integrations}
              </h2>
              <p className="text-xs text-muted">{t.integrationsBody}</p>
              {!chat && (
                <p className="rounded-[10px] bg-warning-soft p-4 text-sm text-warning">
                  {t.chatUpsell}{" "}
                  <Link href={`/w/${slug}/billing`} className="font-semibold underline">
                    {t.seePlans}
                  </Link>
                </p>
              )}
              <div className="space-y-3">
                <p className="flex items-center gap-2.5 text-sm font-semibold">
                  <MessageSquare aria-hidden className="size-5" /> Microsoft Teams
                </p>
                <input
                  name="teamsWebhookUrl"
                  type="url"
                  aria-label={t.teamsUrl}
                  className={input}
                  defaultValue={teamsWebhookUrl}
                  placeholder="https://…logic.azure.com/workflows/…"
                />
                <p className={hint}>{t.teamsHint}</p>
              </div>
              <hr className="border-border" />
              <div className="space-y-3">
                <p className="flex items-center gap-2.5 text-sm font-semibold">
                  <Hash aria-hidden className="size-5" /> Slack
                </p>
                <input
                  name="slackWebhookUrl"
                  type="url"
                  aria-label={t.slackUrl}
                  className={input}
                  defaultValue={slackWebhookUrl}
                  placeholder="https://hooks.slack.com/services/…"
                />
                <p className={hint}>{t.slackHint}</p>
              </div>
              <Toggle
                name="assistantAccess"
                label={t.assistantAccess}
                hint={t.assistantAccessHint}
                defaultChecked={workspace.settings?.assistantAccess ?? true}
                on={t.on}
                off={t.off}
              />
            </section>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
          <p className="text-xs text-muted">{t.saveNote}</p>
          <button className="btn min-h-11 rounded-[10px] px-4 text-[13px]">{t.saveChanges}</button>
        </div>
      </ActionForm>

      <div className="max-w-2xl space-y-6">
      <Link href={`/w/${slug}/leave-types`} className="card flex items-center justify-between gap-4 hover:border-primary/50">
        <span className="space-y-1">
          <span className="block font-medium">{leaveTypesText.settingsLink}</span>
          <span className="block text-sm text-muted">{leaveTypesText.settingsHint}</span>
        </span>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />
      </Link>
      {chat && (teamsWebhookUrl || slackWebhookUrl) && (
        <section className="card space-y-3">
          <h2 className="font-medium">{t.chatCheckHeading}</h2>
          <p className="text-sm text-muted">{t.chatCheckBody}</p>
          {(
            [
              {
                channel: "teams",
                name: "Microsoft Teams",
                url: teamsWebhookUrl,
                error: workspace.settings?.teamsError,
                at: workspace.settings?.teamsErrorAt,
              },
              {
                channel: "slack",
                name: "Slack",
                url: slackWebhookUrl,
                error: workspace.settings?.slackError,
                at: workspace.settings?.slackErrorAt,
              },
            ] as const
          )
            .filter((c) => c.url)
            .map((c) => (
              <div
                key={c.channel}
                className="space-y-2 border-t border-border pt-3"
              >
                {c.error && c.at ? (
                  <div
                    role="alert"
                    className="rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-900/20"
                  >
                    <p className="font-medium">
                      {t.chatFailed(
                        c.name,
                        formatDateTime(c.at, uiLocale, workspace.timezone),
                      )}
                    </p>
                    <p>{t.chatFix(c.name, c.error)}</p>
                  </div>
                ) : (
                  <p className="text-sm">{t.chatOk(c.name)}</p>
                )}
                <ActionForm
                  action={sendTestPostAction.bind(null, slug, c.channel)}
                >
                  <button className="btn-secondary">
                    {t.sendTest(c.name)}
                  </button>
                </ActionForm>
              </div>
            ))}
        </section>
      )}

      <SupportAccess
        slug={slug}
        until={workspace.supportAccessUntil}
        timezone={workspace.timezone}
      />

      <section className="card space-y-3 border-red-500/40">
        <h2 className="font-medium text-danger">
          {t.deleteHeading}
        </h2>
        <p className="text-sm text-muted">{t.deleteBody(workspace.name)}</p>
        <ActionForm
          action={deleteWorkspaceAction.bind(null, slug)}
          className="space-y-3"
        >
          <label className="block space-y-1">
            <span className="text-sm font-medium">
              {t.typeToConfirm(workspace.name)}
            </span>
            <input
              name="confirmName"
              className="input"
              required
              autoComplete="off"
            />
          </label>
          <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
            {t.deleteButton}
          </button>
        </ActionForm>
      </section>
      </div>
    </div>
  );
}
