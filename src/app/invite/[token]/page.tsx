import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { acceptInvitation, findInvitation, normalizeEmail } from "@/lib/invitations";

const problems = {
  invalid: "This invitation link isn't valid.",
  expired: "This invitation has expired. Ask an admin to send a new one.",
  used: "This invitation was already used.",
  revoked: "This invitation was withdrawn.",
} as const;

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const found = await findInvitation(token);
  if (found.status !== "ok") {
    return (
      <div className="mx-auto max-w-md space-y-3">
        <h1 className="text-xl font-semibold">Invitation unavailable</h1>
        <p className="opacity-80">{problems[found.status]}</p>
        <Link href="/" className="underline">
          Go to your workspaces
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
        <h1 className="text-xl font-semibold">Wrong account</h1>
        <p className="opacity-80">
          This invitation to <b>{invitation.workspace.name}</b> is for {invitation.email}, but you&apos;re signed in as{" "}
          {user.email}.
        </p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: path });
          }}
        >
          <button className="btn">Sign out and switch account</button>
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
        redirect(`/w/${slug}`);
      }}
    >
      <h1 className="text-xl font-semibold">Join {invitation.workspace.name}</h1>
      <p className="opacity-80">
        You&apos;ve been invited as {invitation.role === "ADMIN" ? "an admin" : "a member"}.
      </p>
      <button className="btn">Accept invitation</button>
    </form>
  );
}
