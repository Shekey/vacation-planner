import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getMessages } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = (await getMessages()).common.notFound;
  // The usual cause of a workspace link 404ing: signed in with another address than the one invited.
  const email = (await auth())?.user?.email;
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">{t.title}</h1>
      <p className="opacity-80">{t.body}</p>
      {email && (
        <div className="card max-w-md space-y-2 text-sm">
          <p>
            {t.signedInAs} <b className="break-words">{email}</b>. {t.otherAccount}
          </p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/sign-in" });
            }}
          >
            <button className="btn-secondary">{t.switchAccount}</button>
          </form>
        </div>
      )}
      <Link href="/" className="inline-block underline">
        {t.back}
      </Link>
    </div>
  );
}
