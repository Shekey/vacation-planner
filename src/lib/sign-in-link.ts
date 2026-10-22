/** Where Auth.js checks an email sign-in link. Opening it signs the person in and uses the link up. */
export const EMAIL_CALLBACK_PATH = "/api/auth/callback/resend";
export const CONFIRM_PATH = "/sign-in/confirm";

/**
 * The link to put in the sign-in email: our confirm page with the same token, instead of Auth.js's callback.
 * Mail filters (Outlook Safe Links, Defender) open every link in an email before the person does; on the confirm
 * page that visit only shows a button, so the one-time link is still unused when the person clicks it.
 */
export function confirmPageUrl(callbackUrl: string): string {
  const url = new URL(callbackUrl);
  url.pathname = CONFIRM_PATH;
  return url.toString();
}

/** The fields the confirm page's button sends on to Auth.js, or null when the link is incomplete. */
export function callbackFields(params: Record<string, string | string[] | undefined>) {
  const pick = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const fields = { token: pick("token"), email: pick("email"), callbackUrl: pick("callbackUrl") };
  if (!fields.token || !fields.email) return null;
  return fields;
}
