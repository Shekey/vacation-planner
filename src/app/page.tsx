import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMessages } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { listWorkspacesForUser } from "@/lib/workspaces";
import { Landing } from "./landing";

export default async function HomePage() {
  // Visitors who aren't signed in get the product page; everyone else their workspaces.
  if (!(await auth())?.user) return <Landing />;
  const user = await requireUser();
  // First visit: ask for a name so teammates don't see a bare email.
  if (!user.name) redirect("/account?next=/");
  const memberships = await listWorkspacesForUser(user.id);
  const { home: t, common } = await getMessages();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t.heading}</h1>
        <Link href="/workspaces/new" className="btn">
          {t.newWorkspace}
        </Link>
      </div>
      {memberships.length === 0 ? (
        <p className="opacity-80">{t.empty}</p>
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
    </div>
  );
}
