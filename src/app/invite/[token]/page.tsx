import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { getMessages } from "@/lib/i18n/server";
import { acceptInvitation, findInvitation, normalizeEmail } from "@/lib/invitations";

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const found = await findInvitation(token);
  const t = (await getMessages()).invite;
  if (found.status !== "ok") {
    return (
      <div className="mx-auto max-w-md space-y-3">
        <h1 className="text-xl font-semibold">{t.unavailable}</h1>
        <p className="opacity-80">{t.problems[found.status]}</p>
        <Link href="/" className="underline">
          {t.goHome}
        </Link>
      </div>
    );
  }

  const { invitation } = found;
  const session = await auth();
  const path = `/invite/${token}`;

  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(path)}&email=${encodeURIComponent(invitation.email)}`);
  }

  const user = { id: session.user.id, email: session.user.email ?? "" };
  if (normalizeEmail(user.email) !== invitation.email) {
    return (
      <div className="mx-auto max-w-md space-y-3">
        <h1 className="text-xl font-semibold">{t.wrongAccount}</h1>
        <p className="opacity-80">
          {t.wrongAccountBody.before} <b>{invitation.workspace.name}</b> {t.wrongAccountBody.after(invitation.email, user.email)}
        </p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: path });
          }}
        >
          <button className="btn">{t.switchAccount}</button>
        </form>
      </div>
    );
  }

  return (
    <form
      className="mx-auto max-w-md space-y-4"
      action={async () => {
        "use server";
        const slug = await acceptInvitation(token, user);
        redirect(session.user?.name ? `/w/${slug}` : `/account?next=/w/${slug}`);
      }}
    >
      <h1 className="text-xl font-semibold">{t.join(invitation.workspace.name)}</h1>
      <p className="opacity-80">{t.invitedAs(invitation.role === "ADMIN")}</p>
      <button className="btn">{t.accept}</button>
    </form>
  );
}
