import { sortedCountries } from "@/lib/holiday-regions";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { NewWorkspaceForm } from "./form";

export default async function NewWorkspacePage() {
  await requireUser();
  const t = (await getMessages()).newWorkspace;
  const timezones = ["UTC", ...Intl.supportedValuesOf("timeZone").filter((tz) => tz !== "UTC")];
  return (
    <div className="space-y-6">
      <div className="max-w-2xl space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t.heading}</h1>
        <p className="text-muted">{t.intro}</p>
      </div>
      <NewWorkspaceForm timezones={timezones} countries={sortedCountries(await getLocale())} />
    </div>
  );
}
