import { getMessages } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { NewWorkspaceForm } from "./form";

export default async function NewWorkspacePage() {
  await requireUser();
  const t = (await getMessages()).newWorkspace;
  const timezones = ["UTC", ...Intl.supportedValuesOf("timeZone").filter((tz) => tz !== "UTC")];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t.heading}</h1>
      <p className="opacity-80">{t.intro}</p>
      <NewWorkspaceForm timezones={timezones} />
    </div>
  );
}
