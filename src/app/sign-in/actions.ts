"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { enabledOAuthProviders, isOAuthProvider } from "@/lib/oauth";
import { safeRedirectPath } from "@/lib/security";
import { checkSignInAttempt, clientIp } from "@/lib/sign-in-limit";

/** Emails a sign-in link, then shows "check your email" with the address it went to. */
export async function sendSignInLinkAction(formData: FormData) {
  const address = String(formData.get("email") ?? "").trim();
  // Without a specific page to return to (an invite link, say), a fresh sign-in lands on the welcome screen.
  const requested = safeRedirectPath(formData.get("callbackUrl"));
  const callbackUrl = requested === "/" ? "/welcome" : requested;
  const decision = await checkSignInAttempt(address, clientIp(await headers()));
  if (decision === "refused") redirect(`/sign-in?${new URLSearchParams({ error: "RateLimited", email: address, callbackUrl })}`);
  // The links sent in the last minutes still work, so the person sees "check your email", not an error.
  if (decision === "enough") redirect(`/sign-in?${new URLSearchParams({ sent: "1", again: "1", email: address, callbackUrl })}`);
  let next: URL;
  try {
    next = new URL(await signIn("resend", { email: address, redirectTo: callbackUrl, redirect: false }), "http://local");
  } catch (e) {
    // A failed send (Resend down, address refused) comes back to the form with what went wrong, not the error page.
    if (e instanceof AuthError) redirect(`/sign-in?${new URLSearchParams({ error: e.type, email: address, callbackUrl })}`);
    throw e;
  }
  // Auth.js answers with its verify-request page when the email went out, else with ?error=… for the form to show.
  if (next.pathname.endsWith("/verify-request")) redirect(`/sign-in?${new URLSearchParams({ sent: "1", email: address, callbackUrl })}`);
  redirect(`${next.pathname}${next.search}`);
}

/** Starts signing in with Google or Microsoft, when that provider's keys are set. */
export async function signInWithProviderAction(formData: FormData) {
  const provider = formData.get("provider");
  const requested = safeRedirectPath(formData.get("callbackUrl"));
  if (!isOAuthProvider(provider) || !enabledOAuthProviders().includes(provider)) redirect("/sign-in");
  // Signed in already, Auth.js would add this login to the current account instead of signing in.
  if ((await auth())?.user) redirect(requested);
  await signIn(provider, { redirectTo: requested === "/" ? "/welcome" : requested });
}
