import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { SubmitButton } from "@/components/submit-button";
import { safeRedirectPath } from "@/lib/security";
import { tooManySignInLinks } from "@/lib/sign-in-limit";

// Codes Auth.js puts in ?error= when it sends someone back here, plus our own RateLimited.
const ERRORS: Record<string, string> = {
  Configuration: "Sign-in isn't set up correctly on the server, so no email was sent. Please tell your admin.",
  Verification: "That sign-in link has expired or was already used. Enter your email to get a new one.",
  AccessDenied: "You don't have access.",
  RateLimited: "We've already sent a few links to that address. Check your inbox and spam folder, or try again in 10 minutes.",
};
const DEFAULT_ERROR = "Something went wrong signing you in. Please try again.";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  if ((await auth())?.user) redirect("/");
  const { sent, callbackUrl, email, error } = await searchParams;

  if (sent) {
    return (
      <Shell>
        <div className="space-y-3 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-2xl" aria-hidden>
            ✉️
          </div>
          <h1 className="text-xl font-semibold">Check your email</h1>
          <p className="text-muted">
            We sent you a sign-in link. It works once and expires in an hour. You can close this tab.
          </p>
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
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="text-muted">
            {redirectTo.startsWith("/invite/")
              ? "Sign in to accept your invitation. We'll email you a link."
              : "No password needed. We'll email you a link."}
          </p>
        </div>
        {typeof error === "string" && (
          <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
            {ERRORS[error] ?? DEFAULT_ERROR}
          </p>
        )}
        <label className="block space-y-1">
          <span className="text-sm font-medium">Work email</span>
          <input
            className="input"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@company.com"
            defaultValue={typeof email === "string" ? email : undefined}
          />
        </label>
        <SubmitButton className="btn w-full" pending="Sending link…">
          Email me a link
        </SubmitButton>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="card mx-auto mt-6 max-w-sm p-6 sm:mt-12 sm:p-8">{children}</div>;
}
