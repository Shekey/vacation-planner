import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { getMessages } from "@/lib/i18n/server";

/** Shown on team pages while the person is the only one in the workspace, so the empty view says what to do. */
export async function AloneHint({ slug, isAdmin }: { slug: string; isAdmin: boolean }) {
  const t = (await getMessages()).common.alone;
  return (
    <EmptyState icon="👋">
      {isAdmin ? (
        <>
          {t.admin}{" "}
          <Link href={`/w/${slug}/members`} className="font-medium text-primary hover:underline">
            {t.invite}
          </Link>
        </>
      ) : (
        t.member
      )}
    </EmptyState>
  );
}
