import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { SubmitButton } from "@/components/submit-button";
import { getMessages } from "@/lib/i18n/server";
import { safeRedirectPath } from "@/lib/security";
import { tooManySignInLinks } from "@/lib/sign-in-limit";

export async function generateMetadata() {
  return { title: (await getMessages()).signIn.title };
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  if ((await auth())?.user) redirect("/");
  const { sent, callbackUrl, email, error } = await searchParams;
  const t = (await getMessages()).signIn;

  if (sent) {
    return (
      <Shell>
        <div className="space-y-3 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-2xl" aria-hidden>
            ✉️
          </div>
          <h1 className="text-xl font-semibold">{t.checkEmail}</h1>
          <p className="text-muted">{t.sentBody}</p>
        </div>
      </Shell>
    );
  }

  const redirectTo = safeRedirectPath(callbackUrl);

  return (
    <Shell>
      <form
        className="space-y-4"
        action={async (formData) => {
          "use server";
          const address = String(formData.get("email") ?? "").trim();
          if (await tooManySignInLinks(address)) {
            const back = new URLSearchParams({ error: "RateLimited", email: address, callbackUrl: redirectTo });
            redirect(`/sign-in?${back}`);
          }
          await signIn("resend", { email: address, redirectTo });
        }}
      >
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
            defaultValue={typeof email === "string" ? email : undefined}
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
