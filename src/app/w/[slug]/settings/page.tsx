import { ActionForm } from "@/components/action-form";
import Link from "next/link";
import { accessOf } from "@/lib/plans";
import { requireAdmin, settingsOf } from "@/lib/session";
import { deleteWorkspaceAction, saveSettingsAction } from "./actions";

function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-4 w-4" />
      <span>
        <span className="font-medium">{label}</span>
        <span className="block text-sm opacity-70">{hint}</span>
      </span>
    </label>
  );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const metadata = { title: "Settings" };

export default async function SettingsPage({ params }: PageProps<"/w/[slug]/settings">) {
  const { slug } = await params;
  const { workspace } = await requireAdmin(slug);
  const settings = settingsOf(workspace);
  // The raw values, so saving on a plan without chat doesn't wipe the webhooks.
  const teamsWebhookUrl = workspace.settings?.teamsWebhookUrl ?? "";
  const slackWebhookUrl = workspace.settings?.slackWebhookUrl ?? "";
  const chat = accessOf(workspace).chat;
  const defaultAllowance = workspace.settings?.defaultAllowanceDays;
  const [expiryMonth, expiryDay] = settings.carryOverExpiry ? settings.carryOverExpiry.split("-") : ["", ""];
  const timezones = ["UTC", ...Intl.supportedValuesOf("timeZone").filter((tz) => tz !== "UTC")];

  return (
    <div className="max-w-xl space-y-6">
      <ActionForm action={saveSettingsAction.bind(null, slug)} className="space-y-6">
        <section className="space-y-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Workspace name</span>
            <input name="name" className="input" defaultValue={workspace.name} required minLength={2} maxLength={60} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Timezone</span>
            <select name="timezone" className="input" defaultValue={workspace.timezone}>
              {timezones.map((tz) => (
                <option key={tz}>{tz}</option>
              ))}
            </select>
            <span className="block text-xs opacity-60">Decides what &quot;today&quot; is on the calendar.</span>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Default yearly allowance for new members</span>
            <input
              name="defaultAllowance"
              type="number"
              min={0}
              max={365}
              step={0.5}
              className="input w-32"
              defaultValue={defaultAllowance == null ? "" : Number(defaultAllowance)}
            />
            <span className="block text-xs opacity-60">
              Leave empty to not track allowances by default. You can override it per member.
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" name="applyAllowanceToAll" className="h-4 w-4" />
            Also set it for everyone already in the workspace, you included
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Carry over unused days (max)</span>
            <input
              name="maxCarryOver"
              type="number"
              min={0}
              max={365}
              step={0.5}
              className="input w-32"
              defaultValue={settings.maxCarryOverDays ?? ""}
              placeholder="none"
            />
            <span className="block text-xs opacity-60">Unused vacation days, up to this many, are added to the next year.</span>
          </label>
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">Carried-over days must be taken by</legend>
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="carryOverExpiryDay">
                Day
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
                Month
              </label>
              <select id="carryOverExpiryMonth" name="carryOverExpiryMonth" className="input w-auto" defaultValue={expiryMonth}>
                <option value="">Never expire</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1).padStart(2, "0")}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <span className="block text-xs opacity-60">
              Carried-over days are used first. Whatever is left of them after this day is lost, e.g. 31 March as is common in
              Germany.
            </span>
          </fieldset>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Minimum people in</span>
            <input
              name="minPeoplePresent"
              type="number"
              min={1}
              step={1}
              className="input w-32"
              defaultValue={settings.minPeoplePresent ?? ""}
              placeholder="off"
            />
            <span className="block text-xs opacity-60">
              Warns when a booking would leave fewer people working on a day. It warns, it doesn&apos;t block.
            </span>
          </label>
        </section>

        <section className="card space-y-4">
          <h2 className="font-medium">Features</h2>
          <Toggle
            name="approvalsEnabled"
            label="Require approval"
            hint="Bookings by members wait for an admin to approve them. Turning this off approves everything pending."
            defaultChecked={settings.approvalsEnabled}
          />
          <Toggle
            name="allowHalfDays"
            label="Allow half days"
            hint="Members can book mornings or afternoons."
            defaultChecked={settings.allowHalfDays}
          />
          <Toggle
            name="countWeekends"
            label="Count weekends as days off"
            hint="Turn on if your team works weekends. Applies to new and changed bookings."
            defaultChecked={settings.countWeekends}
          />
        </section>

        {!chat && (
          <p className="card border-amber-400/60 bg-amber-50 text-sm dark:bg-amber-900/20">
            Teams and Slack posts are part of the Team and Business plans.{" "}
            <Link href={`/w/${slug}/billing`} className="font-medium text-primary hover:underline">
              See plans →
            </Link>
          </p>
        )}

        <section className="card space-y-2">
          <h2 className="font-medium">Microsoft Teams</h2>
          <input
            name="teamsWebhookUrl"
            type="url"
            aria-label="Microsoft Teams webhook URL"
            className="input"
            defaultValue={teamsWebhookUrl}
            placeholder="https://…logic.azure.com/workflows/…"
          />
          <p className="text-xs opacity-60">
            Posts to a Teams channel when someone books, requests or gets time off approved. In Teams, open the channel&apos;s ⋯ menu →
            Workflows → &quot;Post to a channel when a webhook request is received&quot;, finish the setup, and paste the URL it gives you.
            On weekdays it also posts who&apos;s out, at 06:00 UTC.
          </p>
        </section>

        <section className="card space-y-2">
          <h2 className="font-medium">Slack</h2>
          <input
            name="slackWebhookUrl"
            type="url"
            aria-label="Slack webhook URL"
            className="input"
            defaultValue={slackWebhookUrl}
            placeholder="https://hooks.slack.com/services/…"
          />
          <p className="text-xs opacity-60">
            The same posts in a Slack channel. In Slack, create an app at api.slack.com/apps, turn on Incoming Webhooks, add one for the
            channel, and paste its URL here. You can use Teams, Slack or both.
          </p>
        </section>

        <button className="btn">Save settings</button>
      </ActionForm>

      <section className="card space-y-3 border-red-500/40">
        <h2 className="font-medium text-red-600">Delete workspace</h2>
        <p className="text-sm opacity-70">
          Deletes {workspace.name} with all its members&apos; bookings, allowances and holidays, for everyone. This can&apos;t be undone. To
          hand the workspace over instead, make someone else an admin in Members.
        </p>
        <ActionForm action={deleteWorkspaceAction.bind(null, slug)} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Type {workspace.name} to confirm</span>
            <input name="confirmName" className="input" required autoComplete="off" />
          </label>
          <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete workspace</button>
        </ActionForm>
      </section>
    </div>
  );
}
