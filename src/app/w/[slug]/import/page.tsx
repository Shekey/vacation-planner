import Link from "next/link";
import { getMessages } from "@/lib/i18n/server";
import { OPERATOR } from "@/lib/legal";
import { SETUP_SERVICE_EUR } from "@/lib/plans";
import { requireAdmin } from "@/lib/session";
import { ImportClient } from "./import-client";

export async function generateMetadata() {
  return { title: (await getMessages()).importer.title };
}

export default async function ImportPage({ params }: PageProps<"/w/[slug]/import">) {
  const { slug } = await params;
  await requireAdmin(slug);
  const t = (await getMessages()).importer;
  return (
    <div className="max-w-4xl space-y-4">
      <Link href={`/w/${slug}/members`} className="text-sm text-muted hover:text-foreground hover:underline">
        {t.backToMembers}
      </Link>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">{t.title}</h2>
        <p className="text-sm text-muted">{t.intro}</p>
      </div>
      <ImportClient slug={slug} />
      <p className="text-sm text-muted">{t.assisted(`${SETUP_SERVICE_EUR} €`, OPERATOR.email)}</p>
    </div>
  );
}
