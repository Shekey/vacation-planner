import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMessages } from "@/lib/i18n/server";
import { TRIAL_DAYS } from "@/lib/plans";
import { requireUser } from "@/lib/session";
import { isSuperAdminEmail } from "@/lib/superadmin";
import { restoreDaysLeft, RESTORE_DAYS } from "@/lib/undo";
import { listDeletedWorkspacesForAdmin, listWorkspacesForUser } from "@/lib/workspaces";
import { ActionForm } from "@/components/action-form";
import { restoreWorkspaceAction } from "./workspaces/restore-actions";
import { Landing } from "./landing";

export default async function HomePage() {
  // Visitors who aren't signed in get the product page; everyone else their workspaces.
  if (!(await auth())?.user) return <Landing />;
  const user = await requireUser();
  // First visit: ask for a name so teammates don't see a bare email.
  if (!user.name) redirect("/account?next=/");
  const [memberships, deleted] = await Promise.all([listWorkspacesForUser(user.id), listDeletedWorkspacesForAdmin(user.id)]);
  const { home: t, common, superadmin } = await getMessages();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t.heading}</h1>
        <Link href="/workspaces/new" className="btn">
          {t.newWorkspace}
        </Link>
      </div>
      {memberships.length === 0 ? (
        <div className="space-y-4">
          <p className="text-muted">{t.welcome}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <section className="card space-y-3 bg-gradient-to-br from-sky-50 to-teal-50 dark:from-sky-950/40 dark:to-teal-950/30">
              <h2 className="text-lg font-semibold">
                <span aria-hidden>🚀 </span>
                {t.startTitle}
              </h2>
              <p className="text-sm text-muted">{t.startBody(TRIAL_DAYS)}</p>
              <Link href="/workspaces/new" className="btn">
                {t.startButton}
              </Link>
            </section>
            <section className="card space-y-3">
              <h2 className="text-lg font-semibold">
                <span aria-hidden>✉️ </span>
                {t.invitedTitle}
              </h2>
              <p className="text-sm text-muted">{t.invitedBody(user.email)}</p>
            </section>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {memberships.map(({ workspace, role }) => (
            <li key={workspace.id}>
              <Link href={`/w/${workspace.slug}`} className="card block hover:bg-black/5 dark:hover:bg-white/5">
                <div className="font-medium">{workspace.name}</div>
                <div className="text-sm opacity-70">{role === "ADMIN" ? common.admin : common.member}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {isSuperAdminEmail(user.email) && (
        <p className="text-sm">
          <Link href="/admin" className="text-primary hover:underline">
            {superadmin.title} →
          </Link>
        </p>
      )}
      {deleted.length > 0 && (
        <section className="card space-y-3">
          <h2 className="font-medium">{t.deletedHeading}</h2>
          <p className="text-sm text-muted">{t.deletedBody(RESTORE_DAYS)}</p>
          <ul className="divide-y divide-border">
            {deleted.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <span className="font-medium">{w.name}</span>{" "}
                  <span className="text-muted">· {t.daysLeft(restoreDaysLeft(w.deletedAt!))}</span>
                </span>
                <ActionForm action={restoreWorkspaceAction.bind(null, w.id)}>
                  <button className="btn-secondary px-3 py-1">{t.restore}</button>
                </ActionForm>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
