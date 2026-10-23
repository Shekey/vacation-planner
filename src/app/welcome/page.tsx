import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { AuthShell } from "@/components/auth-shell";
import { db } from "@/lib/db";
import { getMessages } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { listWorkspacesForUser } from "@/lib/workspaces";

export async function generateMetadata() {
  return { title: (await getMessages()).signIn.welcome.title };
}

/**
 * Where a fresh sign-in lands: a greeting and the way into the workspace. People with no or several workspaces
 * skip it, since the home page is where they choose.
 */
export default async function WelcomePage() {
  const user = await requireUser();
  if (!user.name) redirect("/account?next=/welcome");
  const memberships = await listWorkspacesForUser(user.id);
  if (memberships.length !== 1) redirect("/");
  const { workspace } = memberships[0];
  const people = await db.membership.count({ where: { workspaceId: workspace.id, removedAt: null } });
  const t = (await getMessages()).signIn.welcome;
  const href = `/w/${workspace.slug}`;
  const firstName = user.name.split(/\s+/)[0];
  const [lead, ...rest] = t.heading(firstName);

  return (
    <AuthShell>
      <div className="space-y-5 pt-10">
        <span aria-hidden className="grid size-[68px] place-items-center rounded-[22px] bg-success-soft text-success">
          <Check className="size-8" strokeWidth={1.5} />
        </span>
        <p className="text-xs font-semibold text-success">{t.badge}</p>
        <h1 className="text-[32px] leading-[1.15] font-normal">
          {lead}
          {rest.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>
        <p className="text-[15px] text-muted">{t.body}</p>
      </div>
      <Link href={href} className="flex items-center gap-3.5 rounded-[18px] border border-border bg-surface p-5 hover:bg-surface-muted">
        <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-[12px] bg-primary-soft text-[19px] font-semibold text-primary-ink">
          {workspace.name.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 space-y-0.5">
          <span className="block truncate text-[15px] font-semibold">{workspace.name}</span>
          <span className="block text-xs text-muted">{t.workspaceMeta(people)}</span>
        </span>
        <ArrowRight aria-hidden className="size-5 shrink-0 text-primary" />
      </Link>
      <div className="space-y-3">
        <Link href={href} className="btn min-h-[50px] w-full gap-[9px] rounded-[12px] px-[18px] py-3 text-[15px]">
          <ArrowRight aria-hidden className="size-[18px]" />
          {t.continue}
        </Link>
        <p className="text-center text-xs text-muted">{t.ready}</p>
      </div>
      <div className="space-y-3 border-t border-border pt-5 text-xs">
        <p className="text-muted">{t.signedInAs(user.email)}</p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/sign-in" });
          }}
        >
          <button className="inline-flex min-h-11 items-center font-semibold text-primary-ink hover:underline">{t.switch}</button>
        </form>
      </div>
    </AuthShell>
  );
}
