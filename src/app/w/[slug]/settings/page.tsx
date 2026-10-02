import { ActionForm } from "@/components/action-form";
import { requireAdmin, settingsOf } from "@/lib/session";
import { saveSettingsAction } from "./actions";

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

export const metadata = { title: "Settings" };

export default async function SettingsPage({ params }: PageProps<"/w/[slug]/settings">) {
  const { slug } = await params;
  const { workspace } = await requireAdmin(slug);
  const settings = settingsOf(workspace);
  const defaultAllowance = workspace.settings?.defaultAllowanceDays;
  const timezones = ["UTC", ...Intl.supportedValuesOf("timeZone").filter((tz) => tz !== "UTC")];

  return (
    <ActionForm action={saveSettingsAction.bind(null, slug)} className="max-w-xl space-y-6">
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
          <span className="block text-xs opacity-60">Leave empty to not track allowances by default. You can override it per member.</span>
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
          <span className="block text-xs opacity-60">Warns when a booking would leave fewer people working on a day. It warns, it doesn&apos;t block.</span>
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

      <section className="card space-y-2">
        <h2 className="font-medium">Microsoft Teams</h2>
        <input
          name="teamsWebhookUrl"
          type="url"
          className="input"
          defaultValue={settings.teamsWebhookUrl ?? ""}
          placeholder="https://…logic.azure.com/workflows/…"
        />
        <p className="text-xs opacity-60">
          Posts to a Teams channel when someone books, requests or gets time off approved. In Teams, open the channel&apos;s ⋯ menu →
          Workflows → &quot;Post to a channel when a webhook request is received&quot;, finish the setup, and paste the URL it gives you. On weekdays
          it also posts who&apos;s out, at 06:00 UTC.
        </p>
      </section>

      <button className="btn">Save settings</button>
    </ActionForm>
  );
}
