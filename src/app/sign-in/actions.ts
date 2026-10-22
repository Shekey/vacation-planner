"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { safeRedirectPath } from "@/lib/security";
import { tooManySignInLinks } from "@/lib/sign-in-limit";

/** Emails a sign-in link, then shows "check your email" with the address it went to. */
export async function sendSignInLinkAction(formData: FormData) {
  const address = String(formData.get("email") ?? "").trim();
  const callbackUrl = safeRedirectPath(formData.get("callbackUrl"));
  if (await tooManySignInLinks(address)) {
    redirect(`/sign-in?${new URLSearchParams({ error: "RateLimited", email: address, callbackUrl })}`);
  }
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
