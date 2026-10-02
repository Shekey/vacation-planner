import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { SubmitButton } from "@/components/submit-button";

// Codes Auth.js puts in ?error= when it sends someone back here.
const ERRORS: Record<string, string> = {
  Configuration:
    "Sign-in isn't set up correctly on the server, so no email was sent. Check AUTH_SECRET, AUTH_RESEND_KEY and EMAIL_FROM.",
  Verification: "That sign-in link has expired or was already used. Enter your email to get a new one.",
  AccessDenied: "You don't have access.",
};
const DEFAULT_ERROR = "Something went wrong signing you in. Please try again.";

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  if ((await auth())?.user) redirect("/");
  const { sent, callbackUrl, email, error } = await searchParams;

  if (sent) {
    return (
      <div className="mx-auto max-w-sm space-y-2">
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="opacity-80">We sent you a sign-in link.</p>
      </div>
    );
  }

  const redirectTo = typeof callbackUrl === "string" && callbackUrl.startsWith("/") ? callbackUrl : "/";

  return (
    <form
      className="mx-auto max-w-sm space-y-4"
      action={async (formData) => {
        "use server";
        await signIn("resend", { email: formData.get("email"), redirectTo });
      }}
    >
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="opacity-80">
        {redirectTo.startsWith("/invite/")
          ? "Sign in to accept your invitation. We'll email you a link."
          : "We'll email you a link to sign in."}
      </p>
      {typeof error === "string" && (
        <p role="alert" className="rounded-md bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          {ERRORS[error] ?? DEFAULT_ERROR}
        </p>
      )}
      <input
        className="input"
        name="email"
        type="email"
        required
        placeholder="you@company.com"
        defaultValue={typeof email === "string" ? email : undefined}
      />
      <SubmitButton className="btn w-full" pending="Sending link…">
        Email me a link
      </SubmitButton>
    </form>
  );
}
