import Link from "next/link";
import { formatDate, toISO } from "@/lib/dates";
import { directoryAvailable } from "@/lib/directory";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { OPERATOR } from "@/lib/legal";
import { SETUP_SERVICE_EUR } from "@/lib/plans";
import { requireAdmin } from "@/lib/session";
import { ImportClient } from "./import-client";

export async function generateMetadata() {
  return { title: (await getMessages()).importer.title };
}

export default async function ImportPage({ params, searchParams }: PageProps<"/w/[slug]/import">) {
  const { slug } = await params;
  const query = await searchParams;
  const { workspace } = await requireAdmin(slug);
  const t = (await getMessages()).importer;
  const locale = await getLocale();
  const s = workspace.settings;
  const connected = s?.directoryTenantId && s.directoryConnectedAt ? s.directoryConnectedAt : null;
  const directory = {
    available: directoryAvailable(),
    connectedOn: connected ? formatDate(toISO(connected), { day: "numeric", month: "long", year: "numeric" }, locale) : null,
    group: connected && s?.directoryGroupId ? { id: s.directoryGroupId, name: s.directoryGroupName } : null,
    outcome: typeof query.directory === "string" ? query.directory : null,
  };
  return (
    <div className="max-w-4xl space-y-4">
      <Link href={`/w/${slug}/members`} className="text-sm text-muted hover:text-foreground hover:underline">
        {t.backToMembers}
      </Link>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">{t.title}</h2>
        <p className="text-sm text-muted">{t.intro}</p>
      </div>
      <ImportClient slug={slug} directory={directory} initialStart={typeof query.start === "string" ? query.start : undefined} />
      <p className="text-sm text-muted">{t.assisted(`${SETUP_SERVICE_EUR} €`, OPERATOR.email)}</p>
    </div>
  );
}
