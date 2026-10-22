import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SubmitButton } from "@/components/submit-button";
import { getMessages } from "@/lib/i18n/server";
import { safeRedirectPath } from "@/lib/security";
import { sendSignInLinkAction } from "./actions";

export async function generateMetadata() {
  return { title: (await getMessages()).signIn.title };
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  if ((await auth())?.user) redirect("/");
  const { sent, again, callbackUrl, email, error } = await searchParams;
  const t = (await getMessages()).signIn;

  const redirectTo = safeRedirectPath(callbackUrl);
  const address = typeof email === "string" ? email : "";

  if (sent) {
    return (
      <Shell>
        <div className="space-y-3 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary-soft text-2xl" aria-hidden>
            ✉️
          </div>
          <h1 className="text-xl font-semibold">{t.checkEmail}</h1>
          {address && (
            <p>
              {t.sentTo} <b className="break-words">{address}</b>
            </p>
          )}
          <p className="text-muted">{again ? t.alreadySent : t.sentBody}</p>
        </div>
        {address && (
          <form action={sendSignInLinkAction} className="mt-6 space-y-3 border-t border-border pt-4 text-center text-sm">
            <input type="hidden" name="email" value={address} />
            <input type="hidden" name="callbackUrl" value={redirectTo} />
            <p className="text-muted">{t.notArrived}</p>
            <SubmitButton className="btn-secondary w-full" pending={t.sending}>
              {t.resend}
            </SubmitButton>
            <Link href={`/sign-in?${new URLSearchParams({ callbackUrl: redirectTo })}`} className="inline-block underline">
              {t.otherEmail}
            </Link>
          </form>
        )}
      </Shell>
    );
  }

  return (
    <Shell>
      <form className="space-y-4" action={sendSignInLinkAction}>
        <input type="hidden" name="callbackUrl" value={redirectTo} />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{t.heading}</h1>
          <p className="text-muted">{redirectTo.startsWith("/invite/") ? t.inviteIntro : t.intro}</p>
        </div>
        {typeof error === "string" && (
          <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
            {(Object.hasOwn(t.errors, error) ? t.errors[error] : undefined) ?? t.defaultError}
          </p>
        )}
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t.emailLabel}</span>
          <input
            className="input"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder={t.emailPlaceholder}
            defaultValue={address || undefined}
          />
        </label>
        <SubmitButton className="btn w-full" pending={t.sending}>
          {t.submit}
        </SubmitButton>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="card mx-auto mt-6 max-w-sm p-6 sm:mt-12 sm:p-8">{children}</div>;
}
