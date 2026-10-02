import { requireUser } from "@/lib/session";
import { NewWorkspaceForm } from "./form";

export default async function NewWorkspacePage() {
  await requireUser();
  const timezones = ["UTC", ...Intl.supportedValuesOf("timeZone").filter((tz) => tz !== "UTC")];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New workspace</h1>
      <p className="opacity-80">You&apos;ll be the admin. Others join only by invitation.</p>
      <NewWorkspaceForm timezones={timezones} />
    </div>
  );
}
