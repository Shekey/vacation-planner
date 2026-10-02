import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  if ((await auth())?.user) redirect("/");
  const { sent, callbackUrl, email } = await searchParams;

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
      <input
        className="input"
        name="email"
        type="email"
        required
        placeholder="you@company.com"
        defaultValue={typeof email === "string" ? email : undefined}
      />
      <button className="btn w-full">Email me a link</button>
    </form>
  );
}
