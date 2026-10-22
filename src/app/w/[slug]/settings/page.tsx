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
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5"
      />
      <span>
        <span className="font-medium">{label}</span>
        <span className="block text-sm text-muted">{hint}</span>
      </span>
    </label>
  );
}

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
    <div className="max-w-xl space-y-6">
      <ActionForm
        action={saveSettingsAction.bind(null, slug)}
        className="space-y-6"
      >
        <section className="space-y-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t.workspaceName}</span>
            <input
              name="name"
              className="input"
              defaultValue={workspace.name}
              required
              minLength={2}
              maxLength={60}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t.timezone}</span>
            <select
              name="timezone"
              className="input"
              defaultValue={workspace.timezone}
            >
              {timezones.map((tz) => (
                <option key={tz}>{tz}</option>
              ))}
            </select>
            <span className="block text-xs text-muted">{t.timezoneHint}</span>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t.language}</span>
            <select
              name="locale"
              className="input"
              defaultValue={isLocale(locale) ? locale : "en"}
            >
              {LOCALES.map((l) => (
                <option key={l} value={l}>
                  {LOCALE_NAMES[l]}
                </option>
              ))}
            </select>
            <span className="block text-xs text-muted">{t.languageHint}</span>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t.defaultAllowance}</span>
            <input
              name="defaultAllowance"
              type="number"
              min={0}
              max={365}
              step={0.5}
              className="input w-32"
              defaultValue={
                defaultAllowance == null ? "" : Number(defaultAllowance)
              }
            />
            <span className="block text-xs text-muted">
              {t.defaultAllowanceHint}
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" name="applyAllowanceToAll" />
            {t.applyToAll}
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t.carryOver}</span>
            <input
              name="maxCarryOver"
              type="number"
              min={0}
              max={365}
              step={0.5}
              className="input w-32"
              defaultValue={settings.maxCarryOverDays ?? ""}
              placeholder={t.carryOverPlaceholder}
            />
            <span className="block text-xs text-muted">{t.carryOverHint}</span>
          </label>
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">{t.expiry.legend}</legend>
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
                className="input w-20"
                defaultValue={expiryDay ? Number(expiryDay) : ""}
                placeholder="31"
              />
              <label className="sr-only" htmlFor="carryOverExpiryMonth">
                {t.expiry.month}
              </label>
              <select
                id="carryOverExpiryMonth"
                name="carryOverExpiryMonth"
                className="input w-auto"
                defaultValue={expiryMonth}
              >
                <option value="">{t.expiry.never}</option>
                {months.map((m, i) => (
                  <option key={m} value={String(i + 1).padStart(2, "0")}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <span className="block text-xs text-muted">{t.expiry.hint}</span>
          </fieldset>
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t.minPeople}</span>
            <input
              name="minPeoplePresent"
              type="number"
              min={1}
              step={1}
              className="input w-32"
              defaultValue={settings.minPeoplePresent ?? ""}
              placeholder={t.minPeoplePlaceholder}
            />
            <span className="block text-xs text-muted">{t.minPeopleHint}</span>
          </label>
        </section>

        <section className="card space-y-4">
          <h2 className="font-medium">{t.features}</h2>
          <Toggle
            name="approvalsEnabled"
            label={t.approvals}
            hint={t.approvalsHint}
            defaultChecked={settings.approvalsEnabled}
          />
          <Toggle
            name="allowHalfDays"
            label={t.halfDays}
            hint={t.halfDaysHint}
            defaultChecked={settings.allowHalfDays}
          />
          <Toggle
            name="countWeekends"
            label={t.weekends}
            hint={t.weekendsHint}
            defaultChecked={settings.countWeekends}
          />
        </section>

        {!chat && (
          <p className="card border-amber-400/60 bg-amber-50 text-sm dark:bg-amber-900/20">
            {t.chatUpsell}{" "}
            <Link
              href={`/w/${slug}/billing`}
              className="font-medium text-primary hover:underline"
            >
              {t.seePlans}
            </Link>
          </p>
        )}

        <section className="card space-y-2">
          <h2 className="font-medium">Microsoft Teams</h2>
          <input
            name="teamsWebhookUrl"
            type="url"
            aria-label={t.teamsUrl}
            className="input"
            defaultValue={teamsWebhookUrl}
            placeholder="https://…logic.azure.com/workflows/…"
          />
          <p className="text-xs text-muted">{t.teamsHint}</p>
        </section>

        <section className="card space-y-2">
          <h2 className="font-medium">Slack</h2>
          <input
            name="slackWebhookUrl"
            type="url"
            aria-label={t.slackUrl}
            className="input"
            defaultValue={slackWebhookUrl}
            placeholder="https://hooks.slack.com/services/…"
          />
          <p className="text-xs text-muted">{t.slackHint}</p>
        </section>

        <button className="btn">{t.save}</button>
      </ActionForm>

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
  );
}
